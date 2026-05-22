import { isValidAddress, isValidTxHash, normalizeAddress, sanitizeErrorMessage, getExplorerUrl, getExplorerBaseUrl } from '../lib/validation'

describe('Validation Utilities', () => {
  describe('isValidAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38')).toBe(true)
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true)
      expect(isValidAddress('0xabcdef1234567890abcdef1234567890abcdef12')).toBe(true)
    })

    it('should reject invalid addresses', () => {
      expect(isValidAddress('')).toBe(false)
      expect(isValidAddress('0x')).toBe(false)
      expect(isValidAddress('0x123')).toBe(false)
      expect(isValidAddress('not-an-address')).toBe(false)
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc9e7595f2bD38')).toBe(false) // missing 0x
      expect(isValidAddress('0xGGGd35Cc6634C0532925a3b844Bc9e7595f2bD38')).toBe(false) // invalid hex
    })

    it('should handle whitespace', () => {
      expect(isValidAddress('  0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38  ')).toBe(true)
    })
  })

  describe('isValidTxHash', () => {
    it('should validate correct tx hashes', () => {
      expect(isValidTxHash('0x' + 'a'.repeat(64))).toBe(true)
      expect(isValidTxHash('0x' + '0'.repeat(64))).toBe(true)
    })

    it('should reject invalid tx hashes', () => {
      expect(isValidTxHash('')).toBe(false)
      expect(isValidTxHash('0x' + 'a'.repeat(63))).toBe(false) // too short
      expect(isValidTxHash('0x' + 'a'.repeat(65))).toBe(false) // too long
      expect(isValidTxHash('not-a-hash')).toBe(false)
    })
  })

  describe('normalizeAddress', () => {
    it('should trim whitespace', () => {
      expect(normalizeAddress('  0xABC  ')).toBe('0xABC')
    })

    it('should handle already clean addresses', () => {
      expect(normalizeAddress('0xABC')).toBe('0xABC')
    })
  })

  describe('sanitizeErrorMessage', () => {
    it('should strip URLs from error messages', () => {
      const result = sanitizeErrorMessage(new Error('Failed to connect to https://secret-rpc.example.com/v1'))
      expect(result).not.toContain('https://secret-rpc.example.com')
      expect(result).toContain('[endpoint]')
    })

    it('should strip file paths', () => {
      const result = sanitizeErrorMessage(new Error('Error in /app/src/lib/chains.ts'))
      expect(result).not.toContain('/app/src/lib/chains.ts')
      expect(result).toContain('[file]')
    })

    it('should truncate long messages', () => {
      const longMsg = 'x'.repeat(300)
      const result = sanitizeErrorMessage(new Error(longMsg))
      expect(result.length).toBeLessThanOrEqual(203) // 200 + '...'
      expect(result).toContain('...')
    })

    it('should handle non-Error objects', () => {
      const result = sanitizeErrorMessage('string error')
      expect(result).toBe('Internal error')
    })

    it('should handle null/undefined', () => {
      expect(sanitizeErrorMessage(null)).toBe('Internal error')
      expect(sanitizeErrorMessage(undefined)).toBe('Internal error')
    })
  })

  describe('getExplorerBaseUrl', () => {
    it('should return correct explorer for known chains', () => {
      expect(getExplorerBaseUrl(1)).toBe('https://etherscan.io')
      expect(getExplorerBaseUrl(8453)).toBe('https://basescan.org')
      expect(getExplorerBaseUrl(56)).toBe('https://bscscan.com')
      expect(getExplorerBaseUrl(42161)).toBe('https://arbiscan.io')
    })

    it('should fallback to etherscan for unknown chains', () => {
      expect(getExplorerBaseUrl(999999)).toBe('https://etherscan.io')
    })
  })

  describe('getExplorerUrl', () => {
    it('should build address URLs', () => {
      const url = getExplorerUrl(1, '0xabc', 'address')
      expect(url).toBe('https://etherscan.io/address/0xabc')
    })

    it('should build tx URLs', () => {
      const url = getExplorerUrl(8453, '0xdef', 'tx')
      expect(url).toBe('https://basescan.org/tx/0xdef')
    })

    it('should default to address type', () => {
      const url = getExplorerUrl(1, '0xabc')
      expect(url).toBe('https://etherscan.io/address/0xabc')
    })
  })
})
