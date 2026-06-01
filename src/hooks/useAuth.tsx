import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ensureAnonymousSession } from '../lib/supabase'

interface AuthState {
  userId: string | null
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({ userId: null, loading: true, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ userId: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    ensureAnonymousSession()
      .then((userId) => {
        if (!cancelled) setState({ userId, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            userId: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
