import {
  KNOWN_DRAINERS,
  KNOWN_DRAINER_DESTINATIONS,
  DRAINER_METHOD_SELECTORS,
  EXCHANGE_WALLETS,
  isKnownDrainer,
  isExchangeWallet,
  searchDrainers,
  getDrainersForChain,
  detectDrainPattern,
} from '../lib/draindb'

describe('Drainer Database', () => {
  describe('KNOWN_DRAINERS', () => {
    it('should have verified drainers', () => {
      expect(KNOWN_DRAINERS.length).toBeGreaterThan(0)
    })

    it('each drainer should have required fields', () => {
      for (const drainer of KNOWN_DRAINERS) {
        expect(drainer.address).toBeTruthy()
        expect(drainer.name).toBeTruthy()
        expect(drainer.type).toBeTruthy()
        expect(Array.isArray(drainer.chains)).toBe(true)
        expect(drainer.firstSeen).toBeTruthy()
        expect(drainer.lastActive).toBeTruthy()
        expect(typeof drainer.reportCount).toBe('number')
        expect(typeof drainer.verified).toBe('boolean')
      }
    })

    it('addresses should be valid format', () => {
      for (const drainer of KNOWN_DRAINERS) {
        expect(drainer.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
      }
    })
  })

  describe('KNOWN_DRAINER_DESTINATIONS', () => {
    it('should have destination entries', () => {
      expect(Object.keys(KNOWN_DRAINER_DESTINATIONS).length).toBeGreaterThan(0)
    })

    it('each destination should have name, chains, method', () => {
      for (const [addr, dest] of Object.entries(KNOWN_DRAINER_DESTINATIONS)) {
        expect(dest.name).toBeTruthy()
        expect(Array.isArray(dest.chains)).toBe(true)
        expect(dest.method).toBeTruthy()
      }
    })
  })

  describe('DRAINER_METHOD_SELECTORS', () => {
    it('should have known selectors', () => {
      expect(Object.keys(DRAINER_METHOD_SELECTORS).length).toBeGreaterThan(0)
    })

    it('should include critical methods', () => {
      expect(DRAINER_METHOD_SELECTORS['0xa1798512']).toBeDefined()
      expect(DRAINER_METHOD_SELECTORS['0xa1798512'].severity).toBe('critical')
    })

    it('each selector should have name, severity, description', () => {
      for (const [sel, info] of Object.entries(DRAINER_METHOD_SELECTORS)) {
        expect(info.name).toBeTruthy()
        expect(['critical', 'high', 'medium']).toContain(info.severity)
        expect(info.description).toBeTruthy()
      }
    })
  })

  describe('isKnownDrainer', () => {
    it('should detect known drainer contracts', () => {
      const result = isKnownDrainer('0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0')
      expect(result).not.toBeNull()
      expect(result!.name).toContain('Inferno')
    })

    it('should detect known drainer destinations', () => {
      const result = isKnownDrainer('0xc1186b96930a29e3ff1e8c0c10468b2e38a08277')
      expect(result).not.toBeNull()
      expect(result!.name).toContain('Multi-Chain')
    })

    it('should return null for unknown addresses', () => {
      const result = isKnownDrainer('0x0000000000000000000000000000000000000099')
      expect(result).toBeNull()
    })

    it('should be case-insensitive', () => {
      const upper = isKnownDrainer('0xCCE0A2EBE17C5E532802896FC8AFCABB8ABD8BA0')
      expect(upper).not.toBeNull()
    })
  })

  describe('isExchangeWallet', () => {
    it('should detect Binance wallets', () => {
      const result = isExchangeWallet('0x28c6c06298d514db089934071355e5743bf21d60')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Binance')
    })

    it('should detect Coinbase wallets', () => {
      const result = isExchangeWallet('0x974caa59e49682cda0ad2bbe82983419a2ecc400')
      expect(result).not.toBeNull()
      expect(result!.name).toBe('Coinbase')
    })

    it('should return null for non-exchange addresses', () => {
      const result = isExchangeWallet('0x0000000000000000000000000000000000000000')
      expect(result).toBeNull()
    })
  })

  describe('searchDrainers', () => {
    it('should find drainers by name', () => {
      const results = searchDrainers('Inferno')
      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => expect(r.name.toLowerCase()).toContain('inferno'))
    })

    it('should find drainers by address', () => {
      const results = searchDrainers('Cce0A2')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should return empty for no matches', () => {
      const results = searchDrainers('zzzznonexistent')
      expect(results.length).toBe(0)
    })
  })

  describe('getDrainersForChain', () => {
    it('should return Ethereum drainers', () => {
      const drainers = getDrainersForChain(1)
      expect(drainers.length).toBeGreaterThan(0)
      drainers.forEach(d => expect(d.chains).toContain(1))
    })

    it('should return empty for chain with no drainers', () => {
      const drainers = getDrainersForChain(999999)
      expect(drainers.length).toBe(0)
    })
  })

  describe('detectDrainPattern', () => {
    it('should detect compromised wallet from multiple drain txs', () => {
      const txs = [
        { to: '0xc1186b96930a29e3ff1e8c0c10468b2e38a08277', chain: 'zkSync' },
        { to: '0xc1186b96930a29e3ff1e8c0c10468b2e38a08277', chain: 'Gnosis' },
      ]
      const result = detectDrainPattern(txs)
      expect(result.isCompromised).toBe(true)
      expect(result.drainerAddresses.length).toBeGreaterThan(0)
    })

    it('should not flag clean wallets', () => {
      const txs = [
        { to: '0x0000000000000000000000000000000000000099', chain: 'Ethereum' },
      ]
      const result = detectDrainPattern(txs)
      expect(result.isCompromised).toBe(false)
    })
  })
})
