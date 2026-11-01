import { createMiddleware } from 'hono/factory'
import { authOrigins } from '../auth'
import type { WorkerContext } from '../db/schema'

export const privateHeaders = createMiddleware<WorkerContext>(async (c, next) => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  await next()
})

export const requireSameOrigin = createMiddleware<WorkerContext>(async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next()
  const origin = c.req.header('Origin')
  if (!origin || !authOrigins(c.env).includes(origin) || c.req.header('Sec-Fetch-Site') === 'cross-site') {
    return c.json({ code: 'INVALID_ORIGIN', error: 'El origen de la solicitud no está permitido.' }, 403)
  }
  if (!c.req.header('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return c.json({ code: 'INVALID_CONTENT_TYPE', error: 'La solicitud debe usar JSON.' }, 415)
  }
  await next()
})
