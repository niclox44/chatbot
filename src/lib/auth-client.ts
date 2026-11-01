import { createAuthClient } from 'better-auth/react'

// Requests stay on the application's origin; the session is an HttpOnly cookie.
export const authClient = createAuthClient({ basePath: '/api/auth' })

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'El email o la contraseña no son correctos.',
  INVALID_PASSWORD: 'El email o la contraseña no son correctos.',
  USER_NOT_FOUND: 'El email o la contraseña no son correctos.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con este email. Inicia sesión.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con este email. Inicia sesión.',
  INVALID_EMAIL: 'Introduce un email válido.',
  INVALID_PROFILE: 'Indica un nombre y una empresa válidos (hasta 120 caracteres cada uno).',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'La contraseña no puede superar los 128 caracteres.',
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida. Contacta con el administrador de la plataforma.',
  TOO_MANY_REQUESTS: 'Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.',
}

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  if (error?.status === 429) return messages.TOO_MANY_REQUESTS
  return (error?.code && messages[error.code]) || 'No hemos podido completar la solicitud. Vuelve a intentarlo.'
}

export const connectionErrorMessage = 'No se ha podido conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.'
