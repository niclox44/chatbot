import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { request as httpsRequest } from 'node:https'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const wrangler = join(projectRoot, 'node_modules/wrangler/bin/wrangler.js')

async function unusedPort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
  return port
}

// TLS verification is disabled only for this isolated loopback server's self-signed
// development certificate. Real HTTPS and the production cookie configuration run.
function requestLocal(origin, pathname, { method = 'GET', headers = {}, body } = {}) {
  const url = new URL(pathname, origin)
  if (url.origin !== origin || url.hostname !== '127.0.0.1' || url.protocol !== 'https:') {
    throw new Error('Integration requests must remain on the isolated HTTPS loopback server')
  }
  return new Promise((resolveResponse, reject) => {
    const request = httpsRequest(url, { method, headers, rejectUnauthorized: false }, response => {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('error', reject)
      response.on('end', () => {
        const responseHeaders = new Headers()
        for (let index = 0; index < response.rawHeaders.length; index += 2) {
          responseHeaders.append(response.rawHeaders[index], response.rawHeaders[index + 1])
        }
        const status = response.statusCode
        const emptyBody = method === 'HEAD' || [204, 205, 304].includes(status)
        resolveResponse(new Response(emptyBody ? null : Buffer.concat(chunks), { status, headers: responseHeaders }))
      })
    })
    request.on('error', reject)
    request.setTimeout(15_000, () => request.destroy(new Error('Local Worker request timed out')))
    request.end(body)
  })
}

export class WorkerFixture {
  async start() {
    this.directory = await mkdtemp(join(tmpdir(), 'setter-auth-test-'))
    this.secret = randomBytes(48).toString('base64url')
    this.password = `Setter-${randomBytes(24).toString('base64url')}`
    this.output = ''
    this.port = await unusedPort()
    this.origin = `https://127.0.0.1:${this.port}`
    this.persistPath = join(this.directory, 'state')
    this.configPath = join(this.directory, 'wrangler.json')
    const source = JSON.parse(await readFile(join(projectRoot, 'wrangler.jsonc'), 'utf8'))
    const assetsDirectory = join(this.directory, 'assets')
    await mkdir(assetsDirectory)
    await writeFile(join(assetsDirectory, 'index.html'), '<!doctype html><title>API integration fixture</title>')
    const config = {
      name: 'setter-auth-integration-test',
      main: resolve(projectRoot, source.main),
      compatibility_date: source.compatibility_date,
      compatibility_flags: source.compatibility_flags,
      ...(source.tsconfig ? { tsconfig: resolve(projectRoot, source.tsconfig) } : {}),
      vars: {
        ...source.vars,
        ENVIRONMENT: 'production',
        BETTER_AUTH_URL: this.origin,
        TRUSTED_ORIGINS: '',
      },
      assets: { ...source.assets, directory: assetsDirectory },
      d1_databases: source.d1_databases.map(database => ({
        ...database,
        database_id: randomUUID(),
        database_name: 'setter-auth-integration-test',
        migrations_dir: resolve(projectRoot, database.migrations_dir ?? 'migrations'),
        remote: false,
      })),
      durable_objects: source.durable_objects,
      migrations: source.migrations,
    }
    await writeFile(this.configPath, JSON.stringify(config, null, 2))
    await writeFile(join(this.directory, '.dev.vars'), `BETTER_AUTH_SECRET=${this.secret}\n`, { mode: 0o600 })
    this.environment = {
      ...process.env,
      CI: '1',
      WRANGLER_SEND_METRICS: 'false',
      WRANGLER_LOG_PATH: join(this.directory, 'wrangler.log'),
    }
    await this.command(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', this.persistPath])
    this.child = spawn(process.execPath, [wrangler, 'dev', '--config', this.configPath,
      '--local', '--ip', '127.0.0.1', '--port', String(this.port), '--inspector-port', '0',
      '--local-protocol', 'https', '--persist-to', this.persistPath, '--log-level', 'error'], {
      cwd: this.directory,
      env: this.environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    })
    this.child.stdout.on('data', chunk => this.capture(chunk))
    this.child.stderr.on('data', chunk => this.capture(chunk))
    this.child.on('error', error => { this.startError = error })
    this.child.on('exit', (code, signal) => { this.exited = { code, signal } })
    this.signalHandlers = [
      ['SIGINT', () => { void this.stop().finally(() => process.exit(130)) }],
      ['SIGTERM', () => { void this.stop().finally(() => process.exit(143)) }],
    ]
    for (const [signal, handler] of this.signalHandlers) process.once(signal, handler)
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if (this.startError || this.exited) break
      try {
        const response = await this.request('/api/me')
        if (response.status === 401) return this
        if (response.status >= 500) {
          throw new Error(`Worker returned ${response.status}: ${await response.text()}`)
        }
      } catch (error) {
        this.lastError = error
      }
      await delay(150)
    }
    throw new Error(`Isolated Worker failed to start: ${this.redact(this.startError?.message ?? this.lastError?.message ?? '')}\n${this.output}`)
  }

  redact(value) {
    return String(value).replaceAll(this.secret, '[test secret]').replaceAll(this.password, '[test password]')
  }

  capture(chunk) {
    this.output = this.redact(this.output + chunk).slice(-12_000)
  }

  async command(args) {
    const child = spawn(process.execPath, [wrangler, ...args, '--config', this.configPath], {
      cwd: this.directory,
      env: this.environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    const timeout = setTimeout(() => child.kill('SIGTERM'), 60_000)
    try {
      const [code] = await once(child, 'close')
      if (code !== 0) throw new Error(this.redact(`Local Wrangler command failed (${args.slice(0, 3).join(' ')}):\n${output}`))
      return output
    } finally {
      clearTimeout(timeout)
    }
  }

  // SQL is only ever applied to this suite's temporary local database.
  async sql(statement) {
    const sqlPath = join(this.directory, `query-${randomUUID()}.sql`)
    await writeFile(sqlPath, statement)
    try {
      return await this.command(['d1', 'execute', 'DB', '--local', '--persist-to', this.persistPath, '--file', sqlPath, '--json'])
    } finally {
      await rm(sqlPath, { force: true })
    }
  }

  request(pathname, { method = 'GET', cookie, json, origin = this.origin, headers = {} } = {}) {
    return requestLocal(this.origin, pathname, {
      method,
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    })
  }

  async stop() {
    if (this.stopping) return this.stopping
    this.stopping = this.cleanup()
    return this.stopping
  }

  async cleanup() {
    for (const [signal, handler] of this.signalHandlers ?? []) process.off(signal, handler)
    if (this.child?.pid && !this.exited) {
      const exit = once(this.child, 'exit').catch(() => undefined)
      const kill = signal => {
        try {
          if (process.platform === 'win32') this.child.kill(signal)
          else process.kill(-this.child.pid, signal)
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
      kill('SIGTERM')
      const timer = setTimeout(() => kill('SIGKILL'), 3_000)
      try { await exit } finally { clearTimeout(timer) }
    }
    if (this.directory) await rm(this.directory, { force: true, recursive: true })
  }
}

export function sessionCookie(response) {
  const cookies = response.headers.getSetCookie()
  const session = cookies.find(cookie => cookie.split('=', 1)[0].endsWith('session_token'))
  if (!session) throw new Error('Authentication did not return a session cookie')
  return { header: session, value: session.split(';', 1)[0] }
}

export function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}
