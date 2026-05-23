// WalletConnect Integration
// Note: This provides types and helpers. Full WalletConnect requires @walletconnect/modal

export interface WalletConnectSession {
  topic: string
  peer: {
    metadata: {
      name: string
      description: string
      url: string
      icons: string[]
    }
  }
  accounts: string[]
  chainId: number
}

export interface WalletConnectConfig {
  projectId: string
  metadata: {
    name: string
    description: string
    url: string
    icons: string[]
  }
}

export const DEFAULT_WALLETCONNECT_CONFIG: WalletConnectConfig = {
  projectId: '', // Set via env
  metadata: {
    name: 'SweepGuard',
    description: 'Auto-Sweep Wallet Protection',
    url: 'https://sweeptsguard.vercel.app',
    icons: ['🛡️']
  }
}

export function getSupportedChains(): number[] {
  return [1, 8453, 56, 42161, 137, 10]
}

export function getChainNamespaces(): Record<string, { chains: string[]; methods: string[]; events: string[] }> {
  const chains = getSupportedChains()
  return {
    eip155: {
      chains: chains.map(id => `eip155:${id}`),
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
      events: ['chainChanged', 'accountsChanged']
    }
  }
}
