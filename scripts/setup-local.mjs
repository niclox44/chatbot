import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const target = fileURLToPath(new URL('../.dev.vars', import.meta.url))
const contents = `ENVIRONMENT=development\nBETTER_AUTH_URL=http://localhost:5173\nBETTER_AUTH_SECRET=${randomBytes(48).toString('base64url')}\nTRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:8787,http://127.0.0.1:8787\n`
try {
  await writeFile(target, contents, { flag: 'wx', mode: 0o600 })
  console.log('Configuración local creada en .dev.vars con un secreto aleatorio. No subas este archivo a Git.')
} catch (error) {
  if (error.code !== 'EEXIST') throw error
  console.log('.dev.vars ya existe; se ha conservado sin cambios.')
}
