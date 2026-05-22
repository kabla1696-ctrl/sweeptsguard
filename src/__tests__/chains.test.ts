import { CHAINS, getChain, getAllChains, SOLANA_CHAIN, isEVMChain, isSolanaChain, DEFAULT_CHAINS } from '../lib/chains'

describe('Chain Configuration', () => {
  describe('CHAINS', () => {
    it('should have all expected chains', () => {
      const expectedChainIds = [1, 8453, 56, 42161, 137, 10, 43114, 250, 25, 81457, 324, 59144, 5000, 534352, 100, 7000, 80094]
      for (const id of expectedChainIds) {
        expect(CHAINS[id]).toBeDefined()
        expect(CHAINS[id].id).toBe(id)
      }
    })

    it('should have valid RPC URLs for all chains', () => {
      for (const [id, chain] of Object.entries(CHAINS)) {
        expect(chain.rpc).toBeTruthy()
        expect(chain.rpc).toMatch(/^https?:\/\//)
      }
    })

    it('should have valid explorer URLs for all chains', () => {
      for (const [id, chain] of Object.entries(CHAINS)) {
        expect(chain.explorer).toBeTruthy()
        expect(chain.explorer).toMatch(/^https:\/\//)
      }
    })

    it('should have native currency for all chains', () => {
      for (const [id, chain] of Object.entries(CHAINS)) {
        expect(chain.nativeCurrency).toBeTruthy()
      }
    })

    it('should have icons for all chains', () => {
      for (const [id, chain] of Object.entries(CHAINS)) {
        expect(chain.icon).toBeTruthy()
      }
    })

    it('Ethereum should have correct config', () => {
      const eth = CHAINS[1]
      expect(eth.name).toBe('Ethereum')
      expect(eth.shortName).toBe('ETH')
      expect(eth.nativeCurrency).toBe('ETH')
      expect(eth.explorer).toBe('https://etherscan.io')
    })

    it('Base should have correct config', () => {
      const base = CHAINS[8453]
      expect(base.name).toBe('Base')
      expect(base.shortName).toBe('BASE')
      expect(base.explorer).toBe('https://basescan.org')
    })
  })

  describe('getChain', () => {
    it('should return chain config for valid id', () => {
      const chain = getChain(1)
      expect(chain).toBeDefined()
      expect(chain!.name).toBe('Ethereum')
    })

    it('should return undefined for invalid id', () => {
      const chain = getChain(999999)
      expect(chain).toBeUndefined()
    })
  })

  describe('getAllChains', () => {
    it('should return all chains as array', () => {
      const chains = getAllChains()
      expect(Array.isArray(chains)).toBe(true)
      expect(chains.length).toBeGreaterThan(30)
    })

    it('should have unique IDs', () => {
      const chains = getAllChains()
      const ids = chains.map(c => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('SOLANA_CHAIN', () => {
    it('should have correct Solana config', () => {
      expect(SOLANA_CHAIN.id).toBe('solana')
      expect(SOLANA_CHAIN.name).toBe('Solana')
      expect(SOLANA_CHAIN.nativeCurrency.symbol).toBe('SOL')
      expect(SOLANA_CHAIN.isEVM).toBe(false)
    })

    it('should have valid RPC URL', () => {
      expect(SOLANA_CHAIN.rpc).toBeTruthy()
      expect(SOLANA_CHAIN.rpc).toMatch(/^https?:\/\//)
    })
  })

  describe('DEFAULT_CHAINS', () => {
    it('should include major chains', () => {
      expect(DEFAULT_CHAINS).toContain(1)  // Ethereum
      expect(DEFAULT_CHAINS).toContain(8453) // Base
      expect(DEFAULT_CHAINS).toContain(56)  // BSC
      expect(DEFAULT_CHAINS).toContain(42161) // Arbitrum
    })

    it('should have unique chain ids', () => {
      expect(new Set(DEFAULT_CHAINS).size).toBe(DEFAULT_CHAINS.length)
    })
  })

  describe('Helper functions', () => {
    it('isEVMChain should return true for numeric ids', () => {
      expect(isEVMChain(1)).toBe(true)
      expect(isEVMChain('1')).toBe(true)
    })

    it('isSolanaChain should identify solana', () => {
      expect(isSolanaChain('solana')).toBe(true)
      expect(isSolanaChain('ethereum')).toBe(false)
    })
  })
})
