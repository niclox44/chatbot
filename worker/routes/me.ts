import { Hono } from 'hono'
import type { WorkerContext } from '../db/schema'
import { requireSession } from '../middleware/require-session'

export const meRoutes = new Hono<WorkerContext>()
meRoutes.use('*', requireSession)
meRoutes.get('/', (c) => c.json(c.get('identity')))
