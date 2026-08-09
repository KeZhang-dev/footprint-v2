import { describe, expect, it } from 'vitest'
import { getPasswordError, MIN_PASSWORD_LENGTH } from './validation'

describe('getPasswordError', () => {
  it('rejects passwords shorter than the minimum length', () => {
    expect(getPasswordError('short')).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  })

  it('rejects an empty password', () => {
    expect(getPasswordError('')).not.toBeNull()
  })

  it('accepts a password exactly at the minimum length', () => {
    expect(getPasswordError('12345678')).toBeNull()
  })

  it('accepts a password longer than the minimum length', () => {
    expect(getPasswordError('a-very-long-password')).toBeNull()
  })
})
