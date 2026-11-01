import { Hono } from 'hono'
import type { WorkerContext } from '../db/schema'
import { requireSession } from '../middleware/require-session'
import { requireRole } from '../middleware/require-role'

export const clientRoutes = new Hono<WorkerContext>()
clientRoutes.use('*', requireSession, requireRole('client'))
clientRoutes.get('/assistant', async (c) => {
  const clientId = c.get('identity').user.id
  return c.json(await c.env.SETTER_AGENTS.getByName(clientId).getSnapshot(clientId))
})
