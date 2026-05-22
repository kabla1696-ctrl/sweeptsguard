'use client'

import { useState } from 'react'

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void
  onDisconnect?: () => void
}

export default function WalletConnectButton({ onConnect, onDisconnect }: WalletConnectButtonProps) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await (window.ethereum as { request: (args: { method: string }) => Promise<string[]> }).request({
          method: 'eth_requestAccounts'
        })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setConnected(true)
          onConnect?.(accounts[0])
        }
      } else {
        setError('Please install MetaMask or another Web3 wallet')
      }
    } catch {
      setError('Wallet connection failed. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setConnected(false)
    setAddress('')
    setError('')
    onDisconnect?.()
  }

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={handleDisconnect}
          aria-label="Disconnect wallet"
          className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={connecting}
        aria-label="Connect Web3 wallet"
        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : '🔗 Connect Wallet'}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
