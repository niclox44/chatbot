import { Hono } from 'hono'
import type { ClientRecord, WorkerContext } from '../db/schema'
import { requireSession } from '../middleware/require-session'
import { requireRole } from '../middleware/require-role'

const clientColumns = 'p.user_id, p.full_name, p.company_name, p.platform_role, p.status, p.created_at, u.email'
type ClientRow = Omit<ClientRecord, 'assistant_status' | 'conversation_count'>

async function findClient(env: Env, userId: string) {
  const row = await env.DB.prepare(`SELECT ${clientColumns} FROM profiles p JOIN user u ON u.id = p.user_id WHERE p.user_id = ? AND p.platform_role = 'client'`).bind(userId).first<ClientRow>()
  if (!row) return null
  return { ...row, ...await env.SETTER_AGENTS.getByName(row.user_id).getSnapshot(row.user_id) }
}

export const adminRoutes = new Hono<WorkerContext>()
adminRoutes.use('*', requireSession, requireRole('admin'))
adminRoutes.get('/clients', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${clientColumns} FROM profiles p JOIN user u ON u.id = p.user_id WHERE p.platform_role = 'client' ORDER BY p.created_at DESC, p.user_id`).all<ClientRow>()
  const clients = await Promise.all(results.map(async (row) => ({ ...row, ...await c.env.SETTER_AGENTS.getByName(row.user_id).getSnapshot(row.user_id) })))
  return c.json({ clients })
})
adminRoutes.get('/clients/:id', async (c) => {
  const client = await findClient(c.env, c.req.param('id'))
  return client ? c.json({ client }) : c.json({ code: 'CLIENT_NOT_FOUND', error: 'Cliente no encontrado.' }, 404)
})
adminRoutes.patch('/clients/:id', async (c) => {
  const body: unknown = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('status' in body) || typeof body.status !== 'string' || !['active', 'suspended'].includes(body.status) || Object.keys(body).some((key) => key !== 'status')) {
    return c.json({ code: 'INVALID_STATUS', error: 'Indica únicamente un estado válido: active o suspended.' }, 400)
  }
  // The D1 trigger revokes sessions in the same transaction as this update.
  const result = await c.env.DB.prepare("UPDATE profiles SET status = ? WHERE user_id = ? AND platform_role = 'client'").bind(body.status, c.req.param('id')).run()
  if (!result.meta.changes) return c.json({ code: 'CLIENT_NOT_FOUND', error: 'Cliente no encontrado.' }, 404)
  return c.json({ client: await findClient(c.env, c.req.param('id')) })
})
