'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'
import { isENSName, resolveENS, getENSAvatar } from '@/lib/ens'

interface AddressInputProps {
  value: string
  onChange: (value: string) => void
  onResolved?: (address: string) => void
  placeholder?: string
  label?: string
  sublabel?: string
  chainId?: number
  className?: string
  inputClassName?: string
  error?: string
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
  id?: string
  disabled?: boolean
}

const VARIANT_STYLES = {
  default: {
    border: 'border-white/[0.06]',
    focus: 'focus:border-green-500/40',
    bg: 'bg-white/[0.03]',
    ens: 'border-blue-500/30',
  },
  green: {
    border: 'border-green-500/20',
    focus: 'focus:border-green-500/40',
    bg: 'bg-green-500/5',
    ens: 'border-blue-500/30',
  },
  red: {
    border: 'border-red-500/20',
    focus: 'focus:border-red-500/40',
    bg: 'bg-red-500/5',
    ens: 'border-blue-500/30',
  },
  yellow: {
    border: 'border-yellow-500/20',
    focus: 'focus:border-yellow-500/40',
    bg: 'bg-yellow-500/5',
    ens: 'border-blue-500/30',
  },
  blue: {
    border: 'border-blue-500/20',
    focus: 'focus:border-blue-500/40',
    bg: 'bg-blue-500/5',
    ens: 'border-blue-500/30',
  },
}

export default function AddressInput({
  value,
  onChange,
  onResolved,
  placeholder = '0x... or vitalik.eth',
  label,
  sublabel,
  chainId = 1,
  className = '',
  inputClassName = '',
  error,
  variant = 'default',
  id,
  disabled = false,
}: AddressInputProps) {
  const [resolving, setResolving] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [ensName, setEnsName] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [ensError, setEnsError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const styles = VARIANT_STYLES[variant]

  // Debounced ENS resolution
  const resolveInput = useCallback(
    async (input: string) => {
      const trimmed = input.trim()

      // Reset state
      setResolvedAddress(null)
      setEnsName(null)
      setAvatar(null)
      setEnsError(null)

      if (!trimmed) return

      // If it's already a valid address, just pass through
      if (ethers.isAddress(trimmed)) {
        setResolvedAddress(ethers.getAddress(trimmed))
        // Try reverse resolution for display
        try {
          const reverse = await import('@/lib/ens').then(m =>
            m.reverseResolve(trimmed, chainId)
          )
          if (reverse) {
            setEnsName(reverse)
            const av = await import('@/lib/ens').then(m =>
              m.getENSAvatar(reverse, chainId)
            )
            if (av) setAvatar(av)
          }
        } catch { /* ignore */ }
        return
      }

      // If it looks like an ENS name, resolve it
      if (isENSName(trimmed)) {
        setResolving(true)
        try {
          const address = await resolveENS(trimmed, chainId)
          if (address) {
            setResolvedAddress(address)
            setEnsName(trimmed)
            onResolved?.(address)

            // Fetch avatar
            const av = await getENSAvatar(trimmed, chainId)
            if (av) setAvatar(av)
          } else {
            setEnsError(`Could not resolve "${trimmed}"`)
          }
        } catch {
          setEnsError('ENS resolution failed')
        } finally {
          setResolving(false)
        }
      }
    },
    [chainId, onResolved]
  )

  // Debounce on value change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      resolveInput(value)
    }, 500) // 500ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, resolveInput])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const hasError = error || ensError

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="text-xs text-white/30 uppercase tracking-wider mb-2 block">
          {label}
        </label>
      )}
      {sublabel && (
        <p className="text-white/20 text-xs mb-2">{sublabel}</p>
      )}

      <div className="relative">
        {/* Avatar (if ENS resolved) */}
        {avatar && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt="ENS avatar"
              className="w-6 h-6 rounded-full border border-white/10"
              onError={() => setAvatar(null)}
            />
          </div>
        )}

        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 ${avatar ? 'pl-12' : ''} rounded-xl text-white placeholder:text-white/20 focus:outline-none text-sm font-mono ${styles.bg} ${hasError ? 'border border-red-500/40' : styles.border + ' ' + styles.focus} ${inputClassName}`}
        />

        {/* Loading spinner */}
        {resolving && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-blue-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* ENS badge */}
        {ensName && resolvedAddress && !resolving && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              ENS ✓
            </span>
          </div>
        )}
      </div>

      {/* Resolved address preview */}
      {resolvedAddress && value.trim().toLowerCase() !== resolvedAddress.toLowerCase() && (
        <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-center gap-2">
          <span className="text-blue-400 text-xs">→</span>
          <code className="text-blue-300 text-xs font-mono break-all">{resolvedAddress}</code>
          <button
            type="button"
            onClick={() => onChange(resolvedAddress)}
            className="text-blue-400 text-xs hover:text-blue-300 ml-auto shrink-0"
          >
            Use ↗
          </button>
        </div>
      )}

      {/* ENS name display (when input is an address that has ENS) */}
      {ensName && !isENSName(value.trim()) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-blue-400 text-xs">🏷️</span>
          <span className="text-blue-400/70 text-xs">{ensName}</span>
        </div>
      )}

      {/* Error messages */}
      {ensError && (
        <p className="text-red-400 text-xs mt-1.5">❌ {ensError}</p>
      )}
      {error && (
        <p className="text-red-400 text-xs mt-1.5">❌ {error}</p>
      )}
    </div>
  )
}
