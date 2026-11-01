export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 || body?.code === 'ACCOUNT_SUSPENDED') {
      window.dispatchEvent(new Event('auth:refresh'))
    }
    throw new ApiError(body?.error || 'No se ha podido completar la solicitud.', response.status, body?.code)
  }
  return body as T
}
