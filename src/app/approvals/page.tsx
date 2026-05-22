'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import AddressInput from '@/components/AddressInput'

interface ApprovalInfo {
  token: string
  tokenAddress: string
  spender: string
  amount: string
  unlimited: boolean
  risk: 'low' | 'medium' | 'high'
}

export default function ApprovalsPage() {
  const [address, setAddress] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState(1)
  const [loading, setLoading] = useState(false)
  const [approvals, setApprovals] = useState<ApprovalInfo[]>([])
  const [error, setError] = useState('')

  const scanApprovals = async () => {
    const addr = resolvedAddress || address
    if (!addr || !ethers.isAddress(addr)) {
      setError('Please enter a valid EVM address')
      return
    }

    setLoading(true)
    setError('')
    setApprovals([])

    try {
      const chain = CHAINS[chainId]
      if (!chain) throw new Error('Unsupported chain')

      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const currentBlock = await provider.getBlockNumber()
      const fromBlock = currentBlock - 10000

      const approvalTopic = ethers.id('Approval(address,address,uint256)')
      const logs = await provider.getLogs({
        topics: [approvalTopic, ethers.zeroPadValue(addr, 32)],
        fromBlock,
        toBlock: currentBlock,
      })

      const approvalMap = new Map<string, { spender: string; amount: bigint; tokenAddress: string }>()

      for (const log of logs) {
        try {
          const spender = ethers.getAddress('0x' + log.topics[2].slice(26))
          const amount = BigInt(log.data)
          const key = `${log.address}-${spender}`
          approvalMap.set(key, { spender, amount, tokenAddress: log.address })
        } catch { /* skip */ }
      }

      const results: ApprovalInfo[] = []
      for (const [, data] of approvalMap) {
        if (data.amount === 0n) continue

        let tokenSymbol = 'Unknown'
        try {
          const contract = new ethers.Contract(data.tokenAddress, ['function symbol() view returns (string)'], provider)
          tokenSymbol = await contract.symbol()
        } catch { /* ok */ }

        const unlimited = data.amount === ethers.MaxUint256
        let risk: 'low' | 'medium' | 'high' = 'low'
        if (unlimited) risk = 'high'
        else if (data.amount > ethers.parseEther('1000000')) risk = 'medium'

        results.push({
          token: tokenSymbol,
          tokenAddress: data.tokenAddress,
          spender: data.spender,
          amount: unlimited ? 'Unlimited' : parseFloat(ethers.formatEther(data.amount)).toFixed(2),
          unlimited,
          risk,
        })
      }

      setApprovals(results)
      if (results.length === 0) setError('No active approvals found in recent blocks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const revokeApproval = async (tokenAddress: string, spender: string) => {
    if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
      setError('MetaMask not found — please install a wallet')
      return
    }
    try {
      const provider = new ethers.BrowserProvider((window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(tokenAddress, ['function approve(address,uint256) returns (bool)'], signer)
      const tx = await contract.approve(spender, 0)
      await tx.waitForTransaction()
      alert('Approval revoked!')
      scanApprovals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed')
    }
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🔐 Token Approvals</h1>
        <p className="text-white/40 mb-8">Scan and revoke risky token approvals on-chain</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.values(CHAINS).filter(c => c.id !== 0 && c.id !== 10143).slice(0, 10).map(chain => (
            <button key={chain.id} onClick={() => setChainId(chain.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chainId === chain.id ? 'bg-purple-600 text-white' : 'bg-white/[0.03] text-white/40 hover:text-white'}`}>
              {chain.name}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <div className="flex-1">
            <AddressInput value={address} onChange={setAddress} onResolved={setResolvedAddress} placeholder="Enter wallet address (0x...) or ENS name" chainId={chainId} />
          </div>
          <button onClick={scanApprovals} disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold disabled:opacity-50">
            {loading ? 'Scanning...' : '🔍 Scan'}
          </button>
        </div>

        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">{error}</div>}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-purple-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="chainId" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Scanning approvals on {CHAINS[chainId]?.name}...
            </div>
          </div>
        )}

        {approvals.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-white/40 mb-2">Found {approvals.length} active approvals</div>
            {approvals.map((approval, i) => (
              <div key={i} className={`p-5 rounded-2xl border ${
                approval.risk === 'high' ? 'bg-red-500/[0.04] border-red-500/20' :
                approval.risk === 'medium' ? 'bg-yellow-500/[0.04] border-yellow-500/20' :
                'bg-white/[0.02] border-white/[0.06]'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={approval.risk === 'high' ? 'text-red-400' : approval.risk === 'medium' ? 'text-yellow-400' : 'text-green-400'}>
                      {approval.risk === 'high' ? '🔴' : approval.risk === 'medium' ? '🟡' : '🟢'}
                    </span>
                    <div>
                      <div className="font-semibold">{approval.token}</div>
                      <div className="text-xs text-white/40 font-mono">{approval.tokenAddress.slice(0, 10)}...</div>
                    </div>
                  </div>
                  <button onClick={() => revokeApproval(approval.tokenAddress, approval.spender)}
                    className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-sm hover:bg-red-600/30 transition-all">
                    Revoke
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-white/40">Spender</div><div className="font-mono text-xs">{approval.spender}</div></div>
                  <div><div className="text-white/40">Amount</div><div className={approval.unlimited ? 'text-red-400 font-bold' : ''}>{approval.amount}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && approvals.length === 0 && !error && (
          <div className="text-center py-16 text-white/20">
            <div className="text-5xl mb-4">🔐</div>
            <p>Enter an address to scan token approvals</p>
          </div>
        )}
      </div>
    </main>
  )
}
