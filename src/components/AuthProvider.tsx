import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChange, getCurrentUser, signIn, signUp, signOut, resetPassword } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import type { AuthUser } from '../types'

const AuthContext = createContext<{
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  signOut: () => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  isConfigured: boolean
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const current = await getCurrentUser()
      setUser(current)
      setLoading(false)
    })()

    const unsubscribe = onAuthStateChange((u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInFn = async (email: string, password: string) => {
    const result = await signIn(email, password)
    if (!result.error && result.user) setUser(result.user)
    return result
  }

  const signUpFn = async (email: string, password: string, fullName: string) => {
    const result = await signUp(email, password, fullName)
    if (!result.error && result.user) setUser(result.user)
    return result
  }

  const signOutFn = async () => {
    const result = await signOut()
    if (!result.error) setUser(null)
    return result
  }

  const resetPasswordFn = async (email: string) => {
    return resetPassword(email)
  }

  const value = {
    user,
    loading,
    signIn: signInFn,
    signUp: signUpFn,
    signOut: signOutFn,
    resetPassword: resetPasswordFn,
    isConfigured: isSupabaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
