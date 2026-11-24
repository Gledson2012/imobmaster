const KEY = 'imobmaster:lock'

async function hash(password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function setLockPassword(password: string | null): Promise<void> {
  if (!password) {
    localStorage.removeItem(KEY)
    return
  }
  localStorage.setItem(KEY, await hash(password))
}

export async function verifyLockPassword(password: string): Promise<boolean> {
  const stored = localStorage.getItem(KEY)
  if (!stored) return true
  return stored === (await hash(password))
}

export function isLockEnabled(): boolean {
  return !!localStorage.getItem(KEY)
}