import { describe, it, expect } from 'vitest'
import { isEmail, isPhone, isPositiveNumber, required } from './validate'

describe('validate', () => {
  it('validates email', () => {
    expect(isEmail('')).toBe(true)
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('invalid')).toBe(false)
  })
  it('validates phone', () => {
    expect(isPhone('')).toBe(true)
    expect(isPhone('12345678')).toBe(true)
    expect(isPhone('123')).toBe(false)
  })
  it('validates positive number', () => {
    expect(isPositiveNumber('10')).toBe(true)
    expect(isPositiveNumber('0')).toBe(false)
    expect(isPositiveNumber('-5')).toBe(false)
  })
  it('validates required', () => {
    expect(required('abc')).toBe(true)
    expect(required('   ')).toBe(false)
  })
})