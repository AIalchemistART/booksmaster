import { formatCurrency, formatDate, cn } from '@/lib/utils'

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('formats negative amounts in accounting format with parentheses', () => {
      expect(formatCurrency(-100)).toBe('($100.00)')
      expect(formatCurrency(-1234.56)).toBe('($1,234.56)')
    })

    it('handles decimal precision correctly', () => {
      expect(formatCurrency(99.999)).toBe('$100.00')
      expect(formatCurrency(0.01)).toBe('$0.01')
      expect(formatCurrency(0.001)).toBe('$0.00')
    })

    it('handles large numbers', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
    })
  })

  describe('formatDate', () => {
    it('formats date-only strings (YYYY-MM-DD) correctly', () => {
      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
      expect(formatDate('2024-12-31')).toBe('Dec 31, 2024')
    })

    it('formats Date objects correctly', () => {
      const date = new Date(2024, 0, 15) // January 15, 2024
      expect(formatDate(date)).toBe('Jan 15, 2024')
    })

    it('formats ISO strings correctly', () => {
      const isoString = '2024-06-15T12:00:00.000Z'
      const result = formatDate(isoString)
      expect(result).toMatch(/Jun \d+, 2024/) // May vary by timezone
    })
  })

  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('base', true && 'active', false && 'disabled')).toBe('base active')
    })

    it('merges tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('handles undefined and null values', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end')
    })
  })
})
