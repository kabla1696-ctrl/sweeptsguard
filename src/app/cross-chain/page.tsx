'use client'

import { useState } from 'react'

interface LinkedWallet {
  address: string
  chain: string
  chainIcon: string
  label: string
  balance: string
  balanceUsd: number
  riskScore: number
  isCompromised: boolean
  lastActivity: string
}

interface FundFlow {
  id: string
  from: { chain: string; address: string; icon: string }
  to: { chain: string; address: string; icon: string }
  token: string
  amount: number
  valueUsd: number
  timestamp: string
  txHash: string
  bridge: string
}

const DEMO_WALLETS: LinkedWallet[] = [
  { address: '0x1234...5678', chain: 'Ethereum', chainIcon: '⟠', label: 'Main Wallet', balance: '12.5 ETH', balanceUsd: 40000, riskScore: 15, isCompromised: false, lastActivity: '2h ago' },
  { address: '0x1234...5678', chain: 'Arbitrum', chainIcon: '🔵', label: 'Main Wallet', balance: '8.2 ETH', balanceUsd: 26240, riskScore: 15, isCompromised: false, lastActivity: '1h ago' },
  { address: '0x1234...5678', chain: 'Polygon', chainIcon: '🟣', label: 'Main Wallet', balance: '5000 MATIC', balanceUsd: 4500, riskScore: 25, isCompromised: false, lastActivity: '5h ago' },
  { address: '0xABCD...EF01', chain: 'BSC', chainIcon: '🟡', label: 'Trading Wallet', balance: '2.1 BNB', balanceUsd: 630, riskScore: 72, isCompromised: false, lastActivity: '30m ago' },
  { address: '0xABCD...EF01', chain: 'Solana', chainIcon: '◎', label: 'Trading Wallet', balance: '150 SOL', balanceUsd: 22500, riskScore: 72, isCompromised: false, lastActivity: '45m ago' },
]

const DEMO_FLOWS: FundFlow[] = [
  { id: '1', from: { chain: 'Ethereum', address: '0x1234...5678', icon: '⟠' }, to: { chain: 'Arbitrum', address: '0x1234...5678', icon: '🔵' }, token: 'ETH', amount: 5, valueUsd: 16000, timestamp: '2h ago', txHash: '0xabc...def', bridge: 'Stargate' },
  { id: '2', from: { chain: 'Ethereum', address: '0x1234...5678', icon: '⟠' }, to: { chain: 'Polygon', address: '0x1234...5678', icon: '🟣' }, token: 'USDC', amount: 10000, valueUsd: 10000, timestamp: '5h ago', txHash: '0x123...456', bridge: 'Across' },
  { id: '3', from: { chain: 'BSC', address: '0xABCD...EF01', icon: '🟡' }, to: { chain: 'Ethereum', address: '0xDEAD...BEEF', icon: '⟠' }, token: 'BNB', amount: 10, valueUsd: 3000, timestamp: '1h ago', txHash: '0x789...012', bridge: 'Multichain' },
]

export default function CrossChainPage() {
  const [wallets] = useState<LinkedWallet[]>(DEMO_WALLETS)
  const [flows] = useState<FundFlow[]>(DEMO_FLOWS)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [newAddress, setNewAddress] = useState('')
  const [view, setView] = useState<'wallets' | 'flows' | 'graph'>('wallets')

  const groupedWallets = wallets.reduce((acc, w) => {
    const key = w.address
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {} as Record<string, LinkedWallet[]>)

  const totalBalance = wallets.reduce((s, w) => s + w.balanceUsd, 0)
  const avgRisk = Math.round(wallets.reduce((s, w) => s + w.riskScore, 0) / wallets.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔗 Cross-Chain Wallet Linking</h1>
          <p className="text-gray-400">Link wallets across chains. Track fund flows. Detect cross-chain risks.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Linked Wallets', value: wallets.length, icon: '🔗' },
            { label: 'Chains', value: new Set(wallets.map(w => w.chain)).size, icon: '⛓️' },
            { label: 'Total Balance', value: `$${totalBalance.toLocaleString()}`, icon: '💰' },
            { label: 'Avg Risk Score', value: `${avgRisk}/100`, icon: avgRisk < 40 ? '🟢' : avgRisk < 70 ? '🟡' : '🔴' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Wallet */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-8">
          <h3 className="text-white font-semibold mb-3">Link New Wallet</h3>
          <div className="flex gap-3">
            <input
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              placeholder="0x... wallet address"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
            />
            <select className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
              <option>Ethereum</option>
              <option>Arbitrum</option>
              <option>Polygon</option>
              <option>BSC</option>
              <option>Solana</option>
              <option>Optimism</option>
              <option>Base</option>
            </select>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">
              + Link
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-3 mb-6">
          {[{ key: 'wallets', label: '🔗 Linked Wallets' }, { key: 'flows', label: '💸 Fund Flows' }, { key: 'graph', label: '📊 Visual Graph' }].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key as 'wallets' | 'flows' | 'graph')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === v.key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Linked Wallets View */}
        {view === 'wallets' && (
          <div className="space-y-4">
            {Object.entries(groupedWallets).map(([address, chainWallets]) => (
              <div key={address} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-white font-semibold text-lg">{chainWallets[0].label}</div>
                    <div className="text-gray-400 font-mono text-sm">{address}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${chainWallets[0].riskScore < 40 ? 'bg-green-500/20 text-green-400' : chainWallets[0].riskScore < 70 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      Risk: {chainWallets[0].riskScore}/100
                    </span>
                    {chainWallets[0].isCompromised && (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-medium">⚠️ Compromised</span>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chainWallets.map((w, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{w.chainIcon}</span>
                          <span className="text-white font-medium">{w.chain}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{w.lastActivity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">{w.balance}</span>
                        <span className="text-green-400 font-bold text-sm">${w.balanceUsd.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total: <span className="text-white font-bold">${chainWallets.reduce((s, w) => s + w.balanceUsd, 0).toLocaleString()}</span></span>
                  <span className="text-gray-400 text-sm">{chainWallets.length} chains linked</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fund Flows View */}
        {view === 'flows' && (
          <div className="space-y-3">
            {flows.map(f => (
              <div key={f.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{f.from.icon}</span>
                    <div>
                      <div className="text-white font-medium">{f.from.chain}</div>
                      <div className="text-gray-400 text-xs font-mono">{f.from.address}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-indigo-400 font-bold">→</div>
                    <div className="text-gray-500 text-xs">{f.bridge}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-white font-medium">{f.to.chain}</div>
                      <div className="text-gray-400 text-xs font-mono">{f.to.address}</div>
                    </div>
                    <span className="text-2xl">{f.to.icon}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-400 font-bold">{f.amount} {f.token}</span>
                    <span className="text-green-400 font-bold">${f.valueUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">{f.timestamp}</span>
                    <span className="text-gray-500 text-xs font-mono">{f.txHash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visual Graph View */}
        {view === 'graph' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
            <h3 className="text-white font-semibold mb-6 text-center">Cross-Chain Fund Flow Graph</h3>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {['⟠ Ethereum', '🔵 Arbitrum', '🟣 Polygon', '🟡 BSC', '◎ Solana'].map(chain => (
                <div key={chain} className="bg-gray-700/50 border border-gray-600 rounded-xl p-4 text-center min-w-[120px]">
                  <div className="text-lg font-bold text-white">{chain.split(' ')[0]}</div>
                  <div className="text-gray-400 text-sm">{chain.split(' ')[1]}</div>
                  <div className="text-green-400 text-sm mt-1">
                    ${wallets.filter(w => w.chain === chain.split(' ')[1]).reduce((s, w) => s + w.balanceUsd, 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center text-gray-400 text-sm">
              <p>Arrows show fund flow direction between chains</p>
              <p className="mt-2">Node size = wallet balance • Line thickness = transfer volume</p>
            </div>
            <div className="mt-6 flex justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-sm">Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-400 text-sm">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-400 text-sm">High Risk</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
