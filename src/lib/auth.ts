import { supabase, isSupabaseConfigured } from './supabase'
import type { AuthUser } from '../types'

/* ------------------------------------------------------------------ */
/* Verificação de configuração                                        */
/* ------------------------------------------------------------------ */

export function authIsConfigured(): boolean {
  return isSupabaseConfigured
}

/* ------------------------------------------------------------------ */
/* Sessão atual                                                       */
/* ------------------------------------------------------------------ */

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null
  return { id: user.id, email: user.email ?? '', full_name: user.user_metadata?.full_name as string | undefined }
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* ------------------------------------------------------------------ */
/* Cadastro                                                           */
/* ------------------------------------------------------------------ */

export async function signUp(email: string, password: string, fullName: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Supabase não configurado' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) return { user: null, error: error.message }
  const user = data.user
  if (!user) return { user: null, error: 'Usuário não retornado' }
  return { user: { id: user.id, email: user.email ?? '', full_name: fullName }, error: null }
}

/* ------------------------------------------------------------------ */
/* Login                                                              */
/* ------------------------------------------------------------------ */

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  if (!supabase) return { user: null, error: 'Supabase não configurado' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { user: null, error: error.message }
  const user = data.user
  if (!user) return { user: null, error: 'Usuário não retornado' }
  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name as string | undefined,
    },
    error: null,
  }
}

/* ------------------------------------------------------------------ */
/* Logout                                                             */
/* ------------------------------------------------------------------ */

export async function signOut(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase não configurado' }
  const { error } = await supabase.auth.signOut()
  if (error) return { error: error.message }
  return { error: null }
}

/* ------------------------------------------------------------------ */
/* Recuperação de senha                                               */
/* ------------------------------------------------------------------ */

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase não configurado' }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/configuracoes`,
  })
  if (error) return { error: error.message }
  return { error: null }
}

/* ------------------------------------------------------------------ */
/* Observador de auth                                                 */
/* ------------------------------------------------------------------ */

export type AuthChangeCallback = (user: AuthUser | null) => void

export function onAuthStateChange(callback: AuthChangeCallback) {
  if (!supabase) {
    callback(null)
    return () => {}
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    if (!user) {
      callback(null)
      return
    }
    callback({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name as string | undefined,
    })
  })
  return () => {
    data.subscription.unsubscribe()
  }
}
