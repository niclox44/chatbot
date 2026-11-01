import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authClient, authErrorMessage, connectionErrorMessage } from '../lib/auth-client'
import type { AuthIdentity, MeResponse, UserProfile } from '../types/auth'

type SignInInput = { email: string; password: string }
type SignUpInput = SignInInput & { name: string; company_name: string }

type AuthContextValue = {
  user: AuthIdentity | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  suspended: boolean
  sessionExpired: boolean
  refresh: () => Promise<MeResponse | null>
  signIn: (input: SignInInput) => Promise<MeResponse | null>
  signUp: (input: SignUpInput) => Promise<MeResponse | null>
  signOut: () => Promise<void>
}

type SessionState = Pick<AuthContextValue, 'user' | 'profile' | 'loading' | 'error' | 'suspended' | 'sessionExpired'>

const emptySession: SessionState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
  suspended: false,
  sessionExpired: false,
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(emptySession)
  const requestId = useRef(0)
  const authenticated = useRef(false)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    // Revalidate in the background after returning to the tab so form input and
    // the current view stay mounted. Initial checks and error retries still block.
    setState((previous) => ({ ...previous, loading: previous.loading || previous.error !== null, error: null }))

    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' })
      const body = await response.json().catch(() => null)
      if (currentRequest !== requestId.current) return null

      if (response.status === 401) {
        const expired = authenticated.current
        authenticated.current = false
        setState((previous) => ({ ...emptySession, loading: false, sessionExpired: expired || previous.sessionExpired }))
        return null
      }

      if (response.status === 403 && body?.code === 'ACCOUNT_SUSPENDED') {
        authenticated.current = false
        setState({ ...emptySession, loading: false, suspended: true })
        return null
      }

      if (!response.ok || !body?.user?.id || !body?.profile || !['admin', 'client'].includes(body.profile.platform_role)) {
        throw new Error('No podemos comprobar tu sesión en este momento. Vuelve a intentarlo.')
      }

      const session = body as MeResponse
      authenticated.current = true
      setState({ ...session, loading: false, error: null, suspended: false, sessionExpired: false })
      return session
    } catch (error) {
      if (currentRequest !== requestId.current) return null
      const message = error instanceof TypeError ? connectionErrorMessage : error instanceof Error ? error.message : connectionErrorMessage
      setState((previous) => ({ ...previous, loading: false, error: message }))
      throw new Error(message)
    }
  }, [])

  useEffect(() => {
    const checkSession = () => { void refresh().catch(() => undefined) }
    const checkVisibleSession = () => {
      if (document.visibilityState === 'visible') checkSession()
    }
    checkSession()
    window.addEventListener('auth:refresh', checkSession)
    document.addEventListener('visibilitychange', checkVisibleSession)
    return () => {
      ++requestId.current
      window.removeEventListener('auth:refresh', checkSession)
      document.removeEventListener('visibilitychange', checkVisibleSession)
    }
  }, [refresh])

  const signIn = useCallback(async (input: SignInInput) => {
    let result
    try {
      result = await authClient.signIn.email(input)
    } catch {
      throw new Error(connectionErrorMessage)
    }
    if (result.error) throw new Error(authErrorMessage(result.error))
    return refresh()
  }, [refresh])

  const signUp = useCallback(async (input: SignUpInput) => {
    let response: Response
    try {
      response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    } catch {
      throw new Error(connectionErrorMessage)
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(authErrorMessage({ code: body?.code, status: response.status }))
    }
    return refresh()
  }, [refresh])

  const signOut = useCallback(async () => {
    let result
    try {
      result = await authClient.signOut()
    } catch {
      throw new Error(connectionErrorMessage)
    }
    if (result.error) throw new Error(authErrorMessage(result.error))
    ++requestId.current
    authenticated.current = false
    setState({ ...emptySession, loading: false })
  }, [])

  return <AuthContext.Provider value={{ ...state, refresh, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}
