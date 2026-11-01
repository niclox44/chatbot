import { createMiddleware } from 'hono/factory'
import type { PlatformRole, WorkerContext } from '../db/schema'

export const requireRole = (role: PlatformRole) => createMiddleware<WorkerContext>(async (c, next) => {
  if (c.get('identity').profile.platform_role !== role) return c.json({ code: 'FORBIDDEN', error: 'No tienes permiso para acceder a esta sección.' }, 403)
  await next()
})
