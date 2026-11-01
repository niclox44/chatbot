import { spawnSync } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [email, target, ...extra] = process.argv.slice(2)
if (!email || !/^[^\s@'\u0000-\u001f]+@[^\s@'\u0000-\u001f]+\.[^\s@'\u0000-\u001f]+$/.test(email) || !['--local', '--remote'].includes(target) || extra.length) {
  console.error('Uso: npm run admin:create -- correo@empresa.com --local|--remote\nPrimero registra esa cuenta normalmente. El comando no crea ni cambia contraseñas.')
  process.exit(1)
}
const root = fileURLToPath(new URL('../', import.meta.url))
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'setter-admin-'))
try {
  const sqlFile = join(temporary, 'promote.sql')
  // SQLite string literals are escaped independently from the shell (spawn never uses a shell).
  const escapedEmail = email.trim().toLowerCase().replaceAll("'", "''")
  await writeFile(sqlFile, `UPDATE profiles SET platform_role = 'admin' WHERE user_id = (SELECT id FROM user WHERE lower(email) = '${escapedEmail}') AND status = 'active';\nSELECT u.email, p.platform_role, p.status FROM profiles p JOIN user u ON u.id = p.user_id WHERE lower(u.email) = '${escapedEmail}';\n`, { mode: 0o600 })
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'setter-db', target, '--file', sqlFile, '--json'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || 'No se ha podido actualizar la cuenta.')
    process.exitCode = 1
  } else {
    const output = JSON.parse(result.stdout)
    const account = output.flatMap((entry) => entry.results || []).find((row) => row.email)
    if (!account || account.platform_role !== 'admin' || account.status !== 'active') {
      console.error('No se ha encontrado una cuenta activa con ese correo. Regístrala y vuelve a intentarlo.')
      process.exitCode = 1
    } else console.log(`Administrador de plataforma configurado: ${account.email}. Vuelve a iniciar sesión.`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
