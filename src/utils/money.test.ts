import { describe, expect, it } from 'vitest'
import { parseYuanToCents } from './money'

describe('parseYuanToCents', () => {
  it('keeps two decimal places as cents', () => {
    expect(parseYuanToCents('10.2')).toBe(1020)
    expect(parseYuanToCents('10.20')).toBe(1020)
    expect(parseYuanToCents('1,000.5')).toBe(100050)
  })

  it('treats an empty field as zero only when zero is allowed', () => {
    expect(parseYuanToCents('', { allowZero: true })).toBe(0)
    expect(parseYuanToCents('0')).toBeNull()
    expect(parseYuanToCents('10.999')).toBeNull()
  })
})
