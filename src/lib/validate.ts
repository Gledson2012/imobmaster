export function isEmail(value: string): boolean {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isPhone(value: string): boolean {
  if (!value) return true
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8
}

export function isPositiveNumber(value: string | number): boolean {
  const n = typeof value === 'string' ? Number(value) : value
  return !isNaN(n) && n > 0
}

export function required(value: string): boolean {
  return value.trim().length > 0
}