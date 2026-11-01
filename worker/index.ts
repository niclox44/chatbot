import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createAuth } from './auth'
import { findProfile, type WorkerContext } from './db/schema'
import { privateHeaders, requireSameOrigin } from './middleware/security'
import { requireSession } from './middleware/require-session'
import { adminRoutes } from './routes/admin'
import { clientRoutes } from './routes/client'
import { meRoutes } from './routes/me'

export { SetterAgent } from './agents/SetterAgent'

const app = new Hono<WorkerContext>()
app.use('/api/*', privateHeaders, bodyLimit({ maxSize: 16 * 1024 }), requireSameOrigin)
app.use('/agents/*', privateHeaders, requireSameOrigin)
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const authPath = c.req.path.slice('/api/auth'.length)
  const allowed = c.req.method === 'GET' ? authPath === '/get-session' : ['/sign-up/email', '/sign-in/email', '/sign-out'].includes(authPath)
  if (!allowed) return c.json({ code: 'NOT_FOUND', error: 'Ruta no disponible.' }, 404)
  const auth = createAuth(c.env)
  if (authPath === '/get-session') {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session) {
      const profile = await findProfile(c.env.DB, session.user.id)
      if (!profile || profile.status !== 'active') return c.json({ code: 'ACCOUNT_SUSPENDED', error: 'Esta cuenta está suspendida.' }, 403)
    }
  }
  return auth.handler(c.req.raw)
})
app.route('/api/me', meRoutes)
app.route('/api/client', clientRoutes)
app.route('/api/admin', adminRoutes)
app.get('/agents/:clientId', requireSession, async (c) => {
  const identity = c.get('identity')
  const clientId = c.req.param('clientId')
  if (identity.user.id !== clientId && identity.profile.platform_role !== 'admin') return c.json({ code: 'FORBIDDEN', error: 'No tienes acceso a este asistente.' }, 403)
  const target = await findProfile(c.env.DB, clientId)
  if (!target || target.platform_role !== 'client') return c.json({ code: 'CLIENT_NOT_FOUND', error: 'Cliente no encontrado.' }, 404)
  return c.json(await c.env.SETTER_AGENTS.getByName(clientId).getSnapshot(clientId))
})
app.notFound((c) => c.json({ code: 'NOT_FOUND', error: 'Ruta no disponible.' }, 404))
app.onError((error, c) => {
  console.error(JSON.stringify({ event: 'request_failed', path: c.req.path, error: error.name }))
  return c.json({ code: 'INTERNAL_ERROR', error: 'No se ha podido completar la solicitud. Inténtalo de nuevo.' }, 500)
})

export default app
