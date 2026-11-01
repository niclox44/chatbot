import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { findProfile } from './db/schema'

export function authOrigins(env: Env) {
  return [new URL(env.BETTER_AUTH_URL).origin, ...(env.TRUSTED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)]
}

// Bindings and auth state belong to the current request, never a shared isolate.
export function createAuth(env: Env) {
  const baseUrl = new URL(env.BETTER_AUTH_URL)
  const localHttp = env.ENVIRONMENT === 'development' && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname)
  if (baseUrl.protocol !== 'https:' && !localHttp) throw new Error('BETTER_AUTH_URL must use HTTPS outside local development.')
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('Configure BETTER_AUTH_SECRET before starting the Worker.')

  return betterAuth({
    appName: 'Setter',
    baseURL: baseUrl.origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: authOrigins(env),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        company_name: { type: 'string', required: true, input: true },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: baseUrl.protocol === 'https:',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      database: { generateId: () => crypto.randomUUID() },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email' && ctx.body && ['role', 'platform_role', 'status'].some((field) => field in ctx.body)) {
          throw new APIError('BAD_REQUEST', { code: 'INVALID_REGISTRATION', message: 'El rol y el estado se asignan desde el servidor.' })
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const name = user.name.trim()
            const company = typeof user.company_name === 'string' ? user.company_name.trim() : ''
            if (!name || name.length > 120 || !company || company.length > 120) {
              throw new APIError('BAD_REQUEST', { code: 'INVALID_PROFILE', message: 'Indica un nombre y una empresa válidos.' })
            }
            return { data: { ...user, name, company_name: company } }
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const profile = await findProfile(env.DB, session.userId)
            if (!profile || profile.status !== 'active') {
              throw new APIError('FORBIDDEN', { code: 'ACCOUNT_SUSPENDED', message: 'Esta cuenta está suspendida. Contacta con el administrador.' })
            }
          },
        },
      },
    },
  })
}
