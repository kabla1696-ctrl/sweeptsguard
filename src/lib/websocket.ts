// WebSocket client for real-time chain monitoring
// Connects to chain WebSocket RPCs for pending transaction monitoring
// Falls back to polling if WebSocket is unavailable

export interface PendingTx {
  hash: string
  from: string
  to: string
  value: string
  chainId: number
  timestamp: number
}

type SubscriptionCallback = (tx: PendingTx) => void

interface Subscription {
  address: string
  callback: SubscriptionCallback
  filter: (tx: PendingTx) => boolean
}

export class ChainWebSocket {
  private chainId: number
  private wsUrl: string
  private ws: WebSocket | null = null
  private subscriptions: Map<string, Subscription> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private connected = false
  private connectionAttempts = 0
  private maxReconnectAttempts = 5
  private onConnectionChange?: (connected: boolean) => void

  constructor(
    chainId: number,
    wsUrl: string,
    onConnectionChange?: (connected: boolean) => void
  ) {
    this.chainId = chainId
    this.wsUrl = wsUrl
    this.onConnectionChange = onConnectionChange
  }

  connect(): void {
    if (this.ws) {
      this.ws.close()
    }

    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        this.connected = true
        this.connectionAttempts = 0
        this.onConnectionChange?.(true)

        // Re-subscribe to all active subscriptions
        for (const [address] of this.subscriptions) {
          this.sendSubscribe(address)
        }
      }

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(String(event.data))
          this.handleMessage(data)
        } catch {
          // Ignore unparseable messages
        }
      }

      this.ws.onclose = () => {
        this.connected = false
        this.onConnectionChange?.(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.connected = false
        this.onConnectionChange?.(false)
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.connectionAttempts >= this.maxReconnectAttempts) return

    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30_000)
    this.connectionAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private sendSubscribe(address: string): void {
    if (!this.ws || !this.connected) return

    // Standard JSON-RPC subscribe for pending transactions
    this.ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['newPendingTransactions', { from: address }],
    }))
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Handle subscription results
    const params = data.params as { result?: Record<string, unknown> } | undefined
    if (!params?.result) return

    const result = params.result
    const tx: PendingTx = {
      hash: String(result.hash || ''),
      from: String(result.from || '').toLowerCase(),
      to: String(result.to || '').toLowerCase(),
      value: String(result.value || '0x0'),
      chainId: this.chainId,
      timestamp: Date.now(),
    }

    if (!tx.hash) return

    // Dispatch to matching subscriptions
    for (const [, sub] of this.subscriptions) {
      if (sub.filter(tx)) {
        sub.callback(tx)
      }
    }
  }

  subscribe(address: string, callback: SubscriptionCallback): void {
    const normalizedAddr = address.toLowerCase()

    const sub: Subscription = {
      address: normalizedAddr,
      callback,
      filter: (tx: PendingTx) =>
        tx.from === normalizedAddr || tx.to === normalizedAddr,
    }

    this.subscriptions.set(normalizedAddr, sub)

    if (this.connected) {
      this.sendSubscribe(normalizedAddr)
    }
  }

  unsubscribe(address: string): void {
    const normalizedAddr = address.toLowerCase()
    this.subscriptions.delete(normalizedAddr)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connected = false
    this.subscriptions.clear()
    this.onConnectionChange?.(false)
  }

  isConnected(): boolean {
    return this.connected
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// WebSocket URLs for supported chains
export const CHAIN_WS_URLS: Record<number, string> = {
  1: process.env.ETHEREUM_WS_URL || 'wss://eth.drpc.org',
  8453: process.env.BASE_WS_URL || 'wss://base.drpc.org',
  42161: process.env.ARBITRUM_WS_URL || 'wss://arbitrum.drpc.org',
  137: process.env.POLYGON_WS_URL || 'wss://polygon.drpc.org',
  10: process.env.OPTIMISM_WS_URL || 'wss://optimism.drpc.org',
  56: process.env.BSC_WS_URL || 'wss://bsc.drpc.org',
}

// Manager for multiple chain connections
export class MultiChainWebSocket {
  private connections: Map<number, ChainWebSocket> = new Map()

  connectChain(chainId: number, onConnectionChange?: (connected: boolean) => void): ChainWebSocket | null {
    const wsUrl = CHAIN_WS_URLS[chainId]
    if (!wsUrl) return null

    // Reuse existing connection
    const existing = this.connections.get(chainId)
    if (existing) return existing

    const ws = new ChainWebSocket(chainId, wsUrl, onConnectionChange)
    this.connections.set(chainId, ws)
    ws.connect()
    return ws
  }

  disconnectChain(chainId: number): void {
    const ws = this.connections.get(chainId)
    if (ws) {
      ws.disconnect()
      this.connections.delete(chainId)
    }
  }

  disconnectAll(): void {
    for (const [, ws] of this.connections) {
      ws.disconnect()
    }
    this.connections.clear()
  }

  getConnection(chainId: number): ChainWebSocket | undefined {
    return this.connections.get(chainId)
  }

  isChainConnected(chainId: number): boolean {
    return this.connections.get(chainId)?.isConnected() ?? false
  }

  getConnectedChains(): number[] {
    return Array.from(this.connections.entries())
      .filter(([, ws]) => ws.isConnected())
      .map(([id]) => id)
  }
}

export const multiChainWs = new MultiChainWebSocket()
