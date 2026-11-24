import type { AuthUser } from '../types'

const USER_KEY = 'imobmaster:user'
const DEFAULT_USER: AuthUser = { id: 'local-user', email: 'corretor@local', full_name: 'Corretor' }

export function authIsConfigured(): boolean {
  return true
}

function readUser(): AuthUser {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw) as AuthUser
  } catch {}
  localStorage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER))
  return { ...DEFAULT_USER }
}

function writeUser(u: AuthUser | null): void {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
  else localStorage.removeItem(USER_KEY)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return readUser()
}

export async function getSession() {
  return { user: readUser() }
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ user: AuthUser | null; error: string | null; needsConfirmation?: boolean }> {
  const user: AuthUser = { id: crypto.randomUUID(), email, full_name: fullName || 'Corretor' }
  writeUser(user)
  return { user, error: null }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const current = readUser()
  const next: AuthUser = {
    ...current,
    email: email || current.email,
    full_name: current.full_name || (email ? email.split('@')[0] : 'Corretor'),
  }
  writeUser(next)
  return { user: next, error: null }
}

export async function signOut(): Promise<{ error: string | null }> {
  writeUser(null)
  // recria usuário padrão para manter o app acessível (modo offline)
  localStorage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER))
  return { error: null }
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  return { error: null }
}

export async function updatePassword(password: string): Promise<{ error: string | null }> {
  return { error: null }
}

export type AuthChangeCallback = (user: AuthUser | null, event?: string) => void

export function onAuthStateChange(callback: AuthChangeCallback) {
  callback(readUser())
  return () => {}
}