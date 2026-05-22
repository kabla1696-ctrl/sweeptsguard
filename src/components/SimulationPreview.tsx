'use client'

import { useState, useCallback } from 'react'
import type { SimulationResult } from '@/lib/simulation'

interface SimulationPreviewProps {
  chainId: number
  tx: { from: string; to: string; data: string; value?: string }
  onConfirm?: () => void
  onCancel?: () => void
  autoSimulate?: boolean
}

export default function SimulationPreview({
  chainId,
  tx,
  onConfirm,
  onCancel,
  autoSimulate = false,
}: SimulationPreviewProps) {
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [simulated, setSimulated] = useState(false)

  const simulate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId, tx }),
      })
      const data = await res.json()

      if (data.error && !data.success) {
        setError(data.revertReason || data.error)
        setResult(data)
      } else {
        setResult(data)
      }
      setSimulated(true)
    } catch {
      setError('Failed to simulate transaction')
    } finally {
      setLoading(false)
    }
  }, [chainId, tx])

  // Auto-simulate on mount if requested
  useState(() => {
    if (autoSimulate) simulate()
  })

  if (!simulated && !loading) {
    return (
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-400 font-semibold text-sm">🔮 Transaction Preview</p>
            <p className="text-white/40 text-xs mt-1">
              Simulate this transaction to see what will happen before confirming
            </p>
          </div>
          <button
            onClick={simulate}
            className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition-all"
          >
            Simulate
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-xl text-center">
        <svg className="animate-spin h-6 w-6 text-blue-400 mx-auto mb-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-white/50 text-sm">Simulating transaction...</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <p className="text-red-400 text-sm">❌ {error || 'Simulation failed'}</p>
        <button
          onClick={simulate}
          className="mt-2 text-blue-400 text-xs hover:text-blue-300"
        >
          🔄 Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className={`p-4 rounded-xl border ${
        result.success
          ? 'bg-green-500/10 border-green-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{result.success ? '✅' : '❌'}</span>
            <div>
              <p className={`font-semibold text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Simulation Passed' : 'Simulation Failed'}
              </p>
              {result.revertReason && (
                <p className="text-red-300/70 text-xs mt-0.5">{result.revertReason}</p>
              )}
            </div>
          </div>
          <button
            onClick={simulate}
            className="text-white/30 hover:text-white/60 text-xs"
            title="Simulate again"
          >
            🔄 Simulate Again
          </button>
        </div>
      </div>

      {/* Gas Estimate */}
      {result.success && (
        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-white/30 text-xs">Gas Used</p>
              <p className="text-white font-mono text-sm">
                {parseInt(result.gasUsed).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/30 text-xs">Cost (ETH)</p>
              <p className="text-white font-mono text-sm">
                {parseFloat(result.gasCostETH).toFixed(6)}
              </p>
            </div>
            <div>
              <p className="text-white/30 text-xs">Cost (USD)</p>
              <p className="text-white font-mono text-sm">
                ${result.gasCostUSD}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Transfers */}
      {result.tokenTransfers.length > 0 && (
        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Token Transfers</p>
          <div className="space-y-2">
            {result.tokenTransfers.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {t.amount === 'UNLIMITED' ? (
                      <span className="text-red-400 font-semibold text-sm">∞ UNLIMITED</span>
                    ) : (
                      <span className="text-white font-mono text-sm">{t.amount}</span>
                    )}
                    <span className="text-white/40 text-xs">{t.symbol || 'TOKEN'}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-white/30 text-xs">
                      {t.from.slice(0, 6)}...{t.from.slice(-4)}
                    </span>
                    <span className="text-white/20 text-xs">→</span>
                    <span className="text-white/30 text-xs">
                      {t.to.slice(0, 6)}...{t.to.slice(-4)}
                    </span>
                  </div>
                </div>
                {t.token !== 'Native' && t.token !== 'MULTICALL' && (
                  <code className="text-white/20 text-[10px] ml-2 shrink-0">
                    {t.token.slice(0, 8)}...
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => {
            const isCritical = w.includes('🚨') || w.includes('UNLIMITED')
            const isDanger = w.includes('💸') || w.includes('FAIL')
            const bgColor = isCritical
              ? 'bg-red-500/15 border-red-500/30'
              : isDanger
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
            const textColor = isCritical
              ? 'text-red-400'
              : isDanger
                ? 'text-red-400'
                : 'text-yellow-400'

            return (
              <div key={i} className={`p-3 ${bgColor} border rounded-lg`}>
                <p className={`${textColor} text-sm`}>{w}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Buttons */}
      {(onConfirm || onCancel) && result.success && (
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/50 text-sm hover:bg-white/[0.06] transition-all"
            >
              Cancel
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-semibold text-sm hover:brightness-110 transition-all"
            >
              ✅ Confirm & Submit
            </button>
          )}
        </div>
      )}
    </div>
  )
}
