import { createMiddleware } from 'hono/factory'
import { createAuth } from '../auth'
import { findProfile, type WorkerContext } from '../db/schema'

export const requireSession = createMiddleware<WorkerContext>(async (c, next) => {
  const { response: session, headers } = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
    returnHeaders: true,
  })
  for (const cookie of headers.getSetCookie()) c.header('Set-Cookie', cookie, { append: true })
  if (!session) return c.json({ code: 'UNAUTHORIZED', error: 'Inicia sesión para continuar.' }, 401)
  const profile = await findProfile(c.env.DB, session.user.id)
  if (!profile) return c.json({ code: 'PROFILE_NOT_FOUND', error: 'No se ha encontrado el perfil de la cuenta.' }, 403)
  if (profile.status !== 'active') return c.json({ code: 'ACCOUNT_SUSPENDED', error: 'Esta cuenta está suspendida. Contacta con el administrador.' }, 403)
  c.set('identity', { user: { id: session.user.id, email: session.user.email, name: session.user.name }, profile })
  await next()
})
