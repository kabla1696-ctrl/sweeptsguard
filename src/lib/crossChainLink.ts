// Cross-Chain Wallet Linking System
// Link wallets across chains, detect cross-chain fund movement, and propagate risk

import { CHAINS, SOLANA_CHAIN, type ChainConfig } from './chains'
import { isValidAddress, normalizeAddress } from './validation'

// ── Types ───────────────────────────────────────────────────

export interface LinkedWallet {
  address: string
  chainId: number
  chainName: string
  chainIcon: string
  label?: string
  linkedAt: number
  balance?: string
  balanceUsd?: number
  riskScore: number // 0-100
  isCompromised: boolean
  lastActivity: number
}

export interface WalletLink {
  id: string
  wallets: LinkedWallet[]
  createdAt: number
  updatedAt: number
  ownerAddress: string
  totalBalanceUsd: number
  overallRiskScore: number
  isMonitored: boolean
}

export interface CrossChainTransfer {
  id: string
  fromChain: number
  fromChainName: string
  fromChainIcon: string
  fromAddress: string
  toChain: number
  toChainName: string
  toChainIcon: string
  toAddress: string
  amount: string
  amountUsd: number
  token: string
  bridge: string
  txHash: string
  bridgeTxHash?: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  isDrainerRelated: boolean
  drainerName?: string
}

export interface FundFlowNode {
  id: string
  address: string
  chainId: number
  chainName: string
  chainIcon: string
  balance: number
  riskScore: number
  isDrainer: boolean
  label?: string
}

export interface FundFlowEdge {
  id: string
  from: string // node id
  to: string // node id
  amount: number
  token: string
  bridge: string
  timestamp: number
  txHash: string
  isDrainerRelated: boolean
}

export interface FundFlowGraph {
  nodes: FundFlowNode[]
  edges: FundFlowEdge[]
  totalFlowUsd: number
  chainsInvolved: number[]
  riskScore: number
}

export interface BridgeMonitorEvent {
  id: string
  bridge: string
  fromChain: number
  toChain: number
  amount: string
  amountUsd: number
  token: string
  sender: string
  receiver: string
  timestamp: number
  status: 'initiated' | 'completed' | 'flagged'
  flagReason?: string
}

export interface RiskPropagation {
  sourceAddress: string
  sourceChain: number
  linkedAddresses: { address: string; chainId: number; riskScore: number; reason: string }[]
  totalRiskExposure: number
  compromisedChains: number[]
}

export interface MultiChainPortfolio {
  totalUsd: number
  chains: {
    chainId: number
    chainName: string
    chainIcon: string
    nativeBalance: string
    nativeUsd: number
    tokens: { symbol: string; balance: string; usd: number }[]
    totalUsd: number
  }[]
  riskSummary: {
    overallRisk: number
    compromisedChains: number
    linkedDrainerChains: number
  }
}

// ── In-memory store ─────────────────────────────────────────

const walletLinks = new Map<string, WalletLink>()
const crossChainTransfers: CrossChainTransfer[] = []
const bridgeEvents: BridgeMonitorEvent[] = []

// ── Wallet Linking ──────────────────────────────────────────

/**
 * Create a new wallet link group
 */
export function createWalletLink(ownerAddress: string): WalletLink {
  const id = `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const link: WalletLink = {
    id,
    wallets: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ownerAddress: normalizeAddress(ownerAddress).toLowerCase(),
    totalBalanceUsd: 0,
    overallRiskScore: 0,
    isMonitored: true,
  }
  walletLinks.set(id, link)
  return link
}

/**
 * Add a wallet to a link group
 */
export function addWalletToLink(
  linkId: string,
  address: string,
  chainId: number,
  label?: string
): { success: boolean; wallet?: LinkedWallet; error?: string } {
  const link = walletLinks.get(linkId)
  if (!link) return { success: false, error: 'Link group not found' }

  if (!isValidAddress(address)) {
    return { success: false, error: 'Invalid wallet address' }
  }

  const chain = CHAINS[chainId]
  if (!chain) return { success: false, error: `Unsupported chain ID: ${chainId}` }

  const normalized = normalizeAddress(address).toLowerCase()
  const exists = link.wallets.some(w => w.address.toLowerCase() === normalized && w.chainId === chainId)
  if (exists) return { success: false, error: 'Wallet already linked on this chain' }

  const wallet: LinkedWallet = {
    address: normalized,
    chainId,
    chainName: chain.name,
    chainIcon: chain.icon,
    label,
    linkedAt: Date.now(),
    riskScore: 0,
    isCompromised: false,
    lastActivity: Date.now() - Math.floor(Math.random() * 86400000),
    balanceUsd: Math.random() * 10000,
  }

  link.wallets.push(wallet)
  link.updatedAt = Date.now()
  recalculateLinkRisk(link)

  return { success: true, wallet }
}

/**
 * Remove a wallet from a link group
 */
export function removeWalletFromLink(
  linkId: string,
  address: string,
  chainId: number
): { success: boolean; error?: string } {
  const link = walletLinks.get(linkId)
  if (!link) return { success: false, error: 'Link group not found' }

  const normalized = normalizeAddress(address).toLowerCase()
  const index = link.wallets.findIndex(w => w.address.toLowerCase() === normalized && w.chainId === chainId)
  if (index === -1) return { success: false, error: 'Wallet not found in link group' }

  link.wallets.splice(index, 1)
  link.updatedAt = Date.now()
  recalculateLinkRisk(link)

  return { success: true }
}

/**
 * Get a wallet link group by ID
 */
export function getWalletLink(linkId: string): WalletLink | null {
  return walletLinks.get(linkId) || null
}

/**
 * Get all link groups for an owner
 */
export function getWalletLinksForOwner(ownerAddress: string): WalletLink[] {
  const normalized = normalizeAddress(ownerAddress).toLowerCase()
  return Array.from(walletLinks.values()).filter(l => l.ownerAddress === normalized)
}

/**
 * Mark a wallet as compromised and propagate risk
 */
export function markWalletCompromised(
  linkId: string,
  address: string,
  chainId: number
): { success: boolean; propagation?: RiskPropagation; error?: string } {
  const link = walletLinks.get(linkId)
  if (!link) return { success: false, error: 'Link group not found' }

  const normalized = normalizeAddress(address).toLowerCase()
  const wallet = link.wallets.find(w => w.address.toLowerCase() === normalized && w.chainId === chainId)
  if (!wallet) return { success: false, error: 'Wallet not found in link group' }

  wallet.isCompromised = true
  wallet.riskScore = 100
  link.updatedAt = Date.now()

  // Propagate risk to linked wallets
  const propagation = propagateRisk(link, normalized)

  recalculateLinkRisk(link)

  return { success: true, propagation }
}

// ── Cross-Chain Transfer Detection ──────────────────────────

/**
 * Record a cross-chain transfer (would be called by monitoring system)
 */
export function recordCrossChainTransfer(transfer: Omit<CrossChainTransfer, 'id'>): CrossChainTransfer {
  const fullTransfer: CrossChainTransfer = {
    ...transfer,
    id: `cct_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }
  crossChainTransfers.push(fullTransfer)

  // Auto-link wallets if they belong to existing link groups
  autoLinkTransferWallets(fullTransfer)

  return fullTransfer
}

/**
 * Get cross-chain transfers for an address
 */
export function getTransfersForAddress(address: string, limit: number = 50): CrossChainTransfer[] {
  const normalized = normalizeAddress(address).toLowerCase()
  return crossChainTransfers
    .filter(t => t.fromAddress.toLowerCase() === normalized || t.toAddress.toLowerCase() === normalized)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * Get all cross-chain transfers involving drainer wallets
 */
export function getDrainerTransfers(limit: number = 50): CrossChainTransfer[] {
  return crossChainTransfers
    .filter(t => t.isDrainerRelated)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * Detect if a drainer is moving funds across chains
 */
export function detectCrossChainDrainerMovement(drainerAddress: string): {
  isMoving: boolean
  chains: number[]
  totalUsd: number
  recentTransfers: CrossChainTransfer[]
  bridges: string[]
} {
  const normalized = normalizeAddress(drainerAddress).toLowerCase()
  const transfers = crossChainTransfers.filter(
    t => t.fromAddress.toLowerCase() === normalized && t.isDrainerRelated
  )

  const chains = [...new Set(transfers.flatMap(t => [t.fromChain, t.toChain]))]
  const totalUsd = transfers.reduce((sum, t) => sum + t.amountUsd, 0)
  const bridges = [...new Set(transfers.map(t => t.bridge))]

  return {
    isMoving: transfers.length > 0,
    chains,
    totalUsd,
    recentTransfers: transfers.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    bridges,
  }
}

// ── Fund Flow Graph ─────────────────────────────────────────

/**
 * Build a fund flow graph for a wallet address
 */
export function buildFundFlowGraph(address: string, depth: number = 3): FundFlowGraph {
  const normalized = normalizeAddress(address).toLowerCase()
  const nodes: FundFlowNode[] = []
  const edges: FundFlowEdge[] = []
  const visited = new Set<string>()

  // Start node
  const chainIds = Object.keys(CHAINS).map(Number).slice(0, 5)
  const startChain = chainIds[0]
  nodes.push({
    id: `${normalized}-${startChain}`,
    address: normalized,
    chainId: startChain,
    chainName: CHAINS[startChain].name,
    chainIcon: CHAINS[startChain].icon,
    balance: Math.random() * 50000,
    riskScore: 50,
    isDrainer: false,
    label: 'Target Wallet',
  })
  visited.add(normalized)

  // Generate connected nodes (simulated flow)
  const mockAddresses = Array.from({ length: depth * 2 }, () =>
    `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
  )

  for (let i = 0; i < mockAddresses.length; i++) {
    const addr = mockAddresses[i]
    const chainId = chainIds[i % chainIds.length]
    const nodeId = `${addr}-${chainId}`
    const isDrainer = Math.random() > 0.7
    const isBridge = Math.random() > 0.6

    if (!visited.has(addr)) {
      nodes.push({
        id: nodeId,
        address: addr,
        chainId,
        chainName: CHAINS[chainId].name,
        chainIcon: CHAINS[chainId].icon,
        balance: Math.random() * 20000,
        riskScore: isDrainer ? 90 + Math.floor(Math.random() * 10) : Math.floor(Math.random() * 50),
        isDrainer,
        label: isDrainer ? '⚠️ Drainer' : isBridge ? '🌉 Bridge' : undefined,
      })
      visited.add(addr)
    }

    // Connect to a previous node
    const prevNodeId = i === 0 ? `${normalized}-${startChain}` : `${mockAddresses[i - 1]}-${chainIds[(i - 1) % chainIds.length]}`
    const amount = Math.random() * 10000

    edges.push({
      id: `edge-${i}`,
      from: prevNodeId,
      to: nodeId,
      amount,
      token: Math.random() > 0.5 ? 'ETH' : 'USDC',
      bridge: ['Across', 'Stargate', 'Hop', 'Native'][Math.floor(Math.random() * 4)],
      timestamp: Date.now() - Math.floor(Math.random() * 7 * 86400000),
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      isDrainerRelated: isDrainer,
    })
  }

  const totalFlowUsd = edges.reduce((sum, e) => sum + e.amount, 0)
  const chainsInvolved = [...new Set(nodes.map(n => n.chainId))]
  const maxRisk = Math.max(...nodes.map(n => n.riskScore))

  return { nodes, edges, totalFlowUsd, chainsInvolved, riskScore: maxRisk }
}

// ── Bridge Monitoring ───────────────────────────────────────

/**
 * Get bridge monitoring events
 */
export function getBridgeMonitorEvents(limit: number = 30): BridgeMonitorEvent[] {
  if (bridgeEvents.length === 0) {
    generateMockBridgeEvents()
  }
  return bridgeEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

function generateMockBridgeEvents(): void {
  const bridges = ['Across', 'Stargate', 'Hop', 'Wormhole', 'LayerZero']
  const chainIds = Object.keys(CHAINS).map(Number)
  const now = Date.now()

  for (let i = 0; i < 30; i++) {
    const fromChain = chainIds[Math.floor(Math.random() * chainIds.length)]
    let toChain = chainIds[Math.floor(Math.random() * chainIds.length)]
    while (toChain === fromChain) toChain = chainIds[Math.floor(Math.random() * chainIds.length)]

    const amountUsd = Math.random() * 100000
    const isFlagged = Math.random() > 0.85

    bridgeEvents.push({
      id: `be_${i}`,
      bridge: bridges[Math.floor(Math.random() * bridges.length)],
      fromChain,
      toChain,
      amount: (amountUsd / 3000).toFixed(4),
      amountUsd,
      token: Math.random() > 0.5 ? 'ETH' : 'USDC',
      sender: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      receiver: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      timestamp: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
      status: isFlagged ? 'flagged' : Math.random() > 0.1 ? 'completed' : 'initiated',
      flagReason: isFlagged ? 'Linked to known drainer cluster' : undefined,
    })
  }
}

/**
 * Get multi-chain portfolio view for linked wallets
 */
export function getMultiChainPortfolio(linkId: string): MultiChainPortfolio | null {
  const link = walletLinks.get(linkId)
  if (!link) return null

  const chainMap = new Map<number, typeof link.wallets>()
  for (const wallet of link.wallets) {
    if (!chainMap.has(wallet.chainId)) chainMap.set(wallet.chainId, [])
    chainMap.get(wallet.chainId)!.push(wallet)
  }

  const chains = Array.from(chainMap.entries()).map(([chainId, wallets]) => {
    const chain = CHAINS[chainId]
    const totalUsd = wallets.reduce((sum, w) => sum + (w.balanceUsd || 0), 0)
    return {
      chainId,
      chainName: chain?.name || 'Unknown',
      chainIcon: chain?.icon || '🔗',
      nativeBalance: (totalUsd / 3000).toFixed(4),
      nativeUsd: totalUsd * 0.6,
      tokens: [
        { symbol: 'USDC', balance: (totalUsd * 0.3 / 1).toFixed(2), usd: totalUsd * 0.3 },
        { symbol: 'WETH', balance: (totalUsd * 0.1 / 3000).toFixed(4), usd: totalUsd * 0.1 },
      ],
      totalUsd,
    }
  })

  const totalUsd = chains.reduce((sum, c) => sum + c.totalUsd, 0)
  const compromisedChains = link.wallets.filter(w => w.isCompromised).map(w => w.chainId)

  return {
    totalUsd,
    chains,
    riskSummary: {
      overallRisk: link.overallRiskScore,
      compromisedChains: [...new Set(compromisedChains)].length,
      linkedDrainerChains: link.wallets.filter(w => w.riskScore > 70).map(w => w.chainId).length,
    },
  }
}

// ── Internal Helpers ────────────────────────────────────────

function recalculateLinkRisk(link: WalletLink): void {
  if (link.wallets.length === 0) {
    link.overallRiskScore = 0
    link.totalBalanceUsd = 0
    return
  }

  // Risk is the max risk across all wallets, plus a penalty for linked compromised wallets
  const maxRisk = Math.max(...link.wallets.map(w => w.riskScore))
  const compromisedCount = link.wallets.filter(w => w.isCompromised).length
  const compromisePenalty = compromisedCount > 0 ? 20 : 0

  link.overallRiskScore = Math.min(100, maxRisk + compromisePenalty)
  link.totalBalanceUsd = link.wallets.reduce((sum, w) => sum + (w.balanceUsd || 0), 0)
}

function propagateRisk(link: WalletLink, compromisedAddress: string): RiskPropagation {
  const linkedAddresses = link.wallets
    .filter(w => w.address.toLowerCase() !== compromisedAddress)
    .map(w => ({
      address: w.address,
      chainId: w.chainId,
      riskScore: Math.min(100, w.riskScore + 40),
      reason: 'Linked to compromised wallet in same group',
    }))

  // Update risk scores
  for (const linked of linkedAddresses) {
    const wallet = link.wallets.find(w => w.address.toLowerCase() === linked.address && w.chainId === linked.chainId)
    if (wallet) {
      wallet.riskScore = linked.riskScore
      if (linked.riskScore > 80) wallet.isCompromised = true
    }
  }

  const compromisedChains = link.wallets.filter(w => w.isCompromised).map(w => w.chainId)

  return {
    sourceAddress: compromisedAddress,
    sourceChain: link.wallets.find(w => w.address.toLowerCase() === compromisedAddress)?.chainId || 1,
    linkedAddresses,
    totalRiskExposure: linkedAddresses.reduce((sum, l) => sum + l.riskScore, 0) / linkedAddresses.length,
    compromisedChains: [...new Set(compromisedChains)],
  }
}

function autoLinkTransferWallets(transfer: CrossChainTransfer): void {
  // Check if the sender or receiver is in any existing link group
  for (const link of walletLinks.values()) {
    const hasSender = link.wallets.some(w => w.address.toLowerCase() === transfer.fromAddress.toLowerCase())
    const hasReceiver = link.wallets.some(w => w.address.toLowerCase() === transfer.toAddress.toLowerCase())

    if (hasSender && !hasReceiver) {
      // Auto-add receiver to the link group
      const chain = CHAINS[transfer.toChain]
      if (chain) {
        link.wallets.push({
          address: normalizeAddress(transfer.toAddress).toLowerCase(),
          chainId: transfer.toChain,
          chainName: chain.name,
          chainIcon: chain.icon,
          label: 'Auto-detected via bridge',
          linkedAt: Date.now(),
          riskScore: transfer.isDrainerRelated ? 80 : 20,
          isCompromised: transfer.isDrainerRelated,
          lastActivity: transfer.timestamp,
        })
        recalculateLinkRisk(link)
      }
    }

    if (hasReceiver && !hasSender) {
      const chain = CHAINS[transfer.fromChain]
      if (chain) {
        link.wallets.push({
          address: normalizeAddress(transfer.fromAddress).toLowerCase(),
          chainId: transfer.fromChain,
          chainName: chain.name,
          chainIcon: chain.icon,
          label: 'Auto-detected via bridge',
          linkedAt: Date.now(),
          riskScore: transfer.isDrainerRelated ? 80 : 20,
          isCompromised: transfer.isDrainerRelated,
          lastActivity: transfer.timestamp,
        })
        recalculateLinkRisk(link)
      }
    }
  }
}

/**
 * Format USD value for display
 */
export function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string {
  return CHAINS[chainId]?.name || 'Unknown'
}

/**
 * Get chain icon by ID
 */
export function getChainIcon(chainId: number): string {
  return CHAINS[chainId]?.icon || '🔗'
}
