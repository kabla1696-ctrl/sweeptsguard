'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  initSocialRecovery,
  addContact,
  removeContact,
  setThreshold,
  setupShamir,
  requestRecovery,
  voteOnRecovery,
  executeRecovery,
  cancelRecovery,
  getRecoveryConfig,
  getRecoveryRequestsForAddress,
  getRecoveryStatus,
  getHistory,
  type TrustedContact,
  type RecoveryRequest,
  type RecoveryHistory,
  type ShamirConfig,
} from '@/lib/socialRecovery'
import { isValidAddress } from '@/lib/validation'

type Tab = 'guardians' | 'recovery' | 'shamir' | 'history'

export default function SocialRecoveryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('guardians')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [contacts, setContacts] = useState<TrustedContact[]>([])
  const [threshold, setThresholdState] = useState(3)
  const [requests, setRequests] = useState<RecoveryRequest[]>([])
  const [history, setHistory] = useState<RecoveryHistory[]>([])
  const [shamir, setShamir] = useState<ShamirConfig | null>(null)
  const [status, setStatus] = useState<ReturnType<typeof getRecoveryStatus> | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add guardian form
  const [newAddr, setNewAddr] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Recovery form
  const [recoveryNewOwner, setRecoveryNewOwner] = useState('')

  // Shamir form
  const [shamirSecret, setShamirSecret] = useState('')
  const [shamirThreshold, setShamirThreshold] = useState(3)

  const refreshData = useCallback(() => {
    if (!ownerAddress) return
    const config = getRecoveryConfig(ownerAddress)
    if (config) {
      setContacts(config.contacts)
      setThresholdState(config.threshold)
      setShamir(config.shamir)
    }
    setRequests(getRecoveryRequestsForAddress(ownerAddress))
    setHistory(getHistory(50))
    setStatus(getRecoveryStatus(ownerAddress))
  }, [ownerAddress])

  useEffect(() => {
    if (initialized) refreshData()
  }, [initialized, refreshData])

  const handleInit = () => {
    if (!ownerAddress || !isValidAddress(ownerAddress)) {
      setError('Enter a valid wallet address')
      return
    }
    initSocialRecovery(ownerAddress)
    setInitialized(true)
    setError('')
    setSuccess('Social recovery initialized')
    setTimeout(() => setSuccess(''), 2000)
    refreshData()
  }

  const handleAddContact = () => {
    setError('')
    if (!newAddr || !isValidAddress(newAddr)) {
      setError('Invalid guardian address')
      return
    }
    if (!newLabel.trim()) {
      setError('Label is required')
      return
    }

    const result = addContact(ownerAddress, newAddr.trim(), newLabel.trim(), newEmail.trim() || undefined)
    if (result.success) {
      setNewAddr('')
      setNewLabel('')
      setNewEmail('')
      setSuccess(`Added "${result.contact?.label}" as guardian`)
      setTimeout(() => setSuccess(''), 2000)
      refreshData()
    } else {
      setError(result.error || 'Failed to add contact')
    }
  }

  const handleRemoveContact = (addr: string) => {
    const result = removeContact(ownerAddress, addr)
    if (result.success) {
      setSuccess('Guardian removed')
      setTimeout(() => setSuccess(''), 2000)
      refreshData()
    } else {
      setError(result.error || 'Failed to remove')
    }
  }

  const handleSetThreshold = (val: number) => {
    const result = setThreshold(ownerAddress, val)
    if (result.success) {
      setSuccess(`Threshold set to ${val} of ${contacts.length}`)
      setTimeout(() => setSuccess(''), 2000)
      refreshData()
    } else {
      setError(result.error || 'Failed to set threshold')
    }
  }

  const handleSetupShamir = () => {
    if (!shamirSecret.trim()) {
      setError('Enter a secret to split')
      return
    }
    const result = setupShamir(ownerAddress, shamirSecret.trim(), shamirThreshold)
    if (result.success) {
      setSuccess('Shamir shares generated and distributed to guardians')
      setShamirSecret('')
      setTimeout(() => setSuccess(''), 3000)
      refreshData()
    } else {
      setError(result.error || 'Failed to setup Shamir')
    }
  }

  const handleRequestRecovery = () => {
    if (!recoveryNewOwner || !isValidAddress(recoveryNewOwner)) {
      setError('Enter a valid new owner address')
      return
    }
    const result = requestRecovery(ownerAddress, recoveryNewOwner, ownerAddress)
    if (result.success) {
      setSuccess(`Recovery request created. ID: ${result.request?.id}`)
      setRecoveryNewOwner('')
      setTimeout(() => setSuccess(''), 3000)
      refreshData()
    } else {
      setError(result.error || 'Failed to create recovery request')
    }
  }

  const handleVote = (requestId: string, vote: 'approve' | 'reject') => {
    const result = voteOnRecovery(requestId, ownerAddress, vote)
    if (result.success) {
      setSuccess(`Vote recorded: ${vote}`)
      setTimeout(() => setSuccess(''), 2000)
      refreshData()
    } else {
      setError(result.error || 'Failed to vote')
    }
  }

  const handleExecute = (requestId: string) => {
    const result = executeRecovery(requestId)
    if (result.success) {
      setSuccess(`Recovery executed! TX: ${result.txHash?.slice(0, 12)}...`)
      setTimeout(() => setSuccess(''), 3000)
      refreshData()
    } else {
      setError(result.error || 'Failed to execute')
    }
  }

  const handleCancel = (requestId: string) => {
    const result = cancelRecovery(requestId, ownerAddress)
    if (result.success) {
      setSuccess('Recovery request cancelled')
      setTimeout(() => setSuccess(''), 2000)
      refreshData()
    } else {
      setError(result.error || 'Failed to cancel')
    }
  }

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    voting: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    executed: 'bg-green-500/10 text-green-400 border-green-500/20',
    expired: 'bg-white/5 text-white/40 border-white/10',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <main className="min-h-screen bg-[#030305] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-green-400 transition-colors">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-green-400 transition-colors">Dashboard</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-2">
            🤝 Social <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Recovery</span>
          </h1>
          <p className="text-gray-500 text-lg">Trusted guardians, Shamir&apos;s Secret Sharing, and multi-sig recovery</p>
        </div>

        {/* Init / Wallet Input */}
        {!initialized ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm mb-8">
            <h3 className="text-lg font-semibold mb-4">Connect Your Wallet</h3>
            <p className="text-white/40 text-sm mb-4">Enter your wallet address to set up social recovery</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={ownerAddress}
                onChange={e => setOwnerAddress(e.target.value)}
                placeholder="Your wallet address (0x...)"
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm font-mono"
              />
              <button
                onClick={handleInit}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
              >
                Initialize
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            {status && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-white/40 text-xs mb-1">Guardians</p>
                  <p className="text-2xl font-bold text-blue-400">{status.contactCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-white/40 text-xs mb-1">Threshold</p>
                  <p className="text-2xl font-bold text-purple-400">{status.threshold}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-white/40 text-xs mb-1">Active Requests</p>
                  <p className="text-2xl font-bold text-yellow-400">{status.activeRequests}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-white/40 text-xs mb-1">Shamir SSS</p>
                  <p className="text-2xl font-bold text-green-400">{status.shamirEnabled ? '✅' : '❌'}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-white/40 text-xs mb-1">Status</p>
                  <p className="text-2xl font-bold text-green-400">🟢</p>
                </div>
              </div>
            )}

            {/* Toasts */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 flex items-center gap-2">
                <span>❌</span> {error}
                <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm mb-6 flex items-center gap-2">
                <span>✅</span> {success}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-8 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit flex-wrap">
              {(['guardians', 'recovery', 'shamir', 'history'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {tab === 'guardians' ? '👥 Guardians' : tab === 'recovery' ? '🔄 Recovery' : tab === 'shamir' ? '🔐 Shamir SSS' : '📜 History'}
                </button>
              ))}
            </div>

            {/* ── Guardians Tab ── */}
            {activeTab === 'guardians' && (
              <div className="space-y-6">
                {/* Add Guardian */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-4">Add Trusted Guardian</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={newAddr}
                      onChange={e => setNewAddr(e.target.value)}
                      placeholder="Guardian wallet address (0x...)"
                      className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm font-mono"
                    />
                    <input
                      type="text"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="Label (e.g., Mom, Best Friend)"
                      className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm"
                    />
                    <div className="md:col-span-2">
                      <button
                        onClick={handleAddContact}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold text-sm hover:from-blue-500 hover:to-cyan-500 transition-all"
                      >
                        + Add Guardian
                      </button>
                    </div>
                  </div>
                </div>

                {/* Threshold */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <h3 className="text-lg font-semibold mb-4">Recovery Threshold</h3>
                  <p className="text-white/40 text-sm mb-4">How many guardians must approve to recover the wallet</p>
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 text-sm">Threshold:</span>
                    <div className="flex gap-2">
                      {Array.from({ length: Math.max(contacts.length, 2) }, (_, i) => i + 2).map(n => (
                        <button
                          key={n}
                          onClick={() => handleSetThreshold(n)}
                          disabled={n > contacts.length}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                            n === threshold
                              ? 'bg-blue-600 text-white'
                              : n > contacts.length
                                ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                                : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-white/30 text-sm">of {contacts.length}</span>
                  </div>
                </div>

                {/* Guardian List */}
                <div className="space-y-3">
                  {contacts.length > 0 ? contacts.map(contact => (
                    <div key={contact.address} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/20 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">👤</span>
                          <div>
                            <p className="font-medium text-sm">{contact.label}</p>
                            <p className="text-white/30 text-xs font-mono">{contact.address.slice(0, 10)}...{contact.address.slice(-8)}</p>
                            {contact.email && <p className="text-white/20 text-xs mt-0.5">📧 {contact.email}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            contact.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {contact.status}
                          </span>
                          <span className="text-white/20 text-xs">Weight: {contact.voteWeight}</span>
                          <button
                            onClick={() => handleRemoveContact(contact.address)}
                            className="text-red-400/40 hover:text-red-400 text-xs transition-colors px-2 py-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                      <span className="text-4xl block mb-3">👥</span>
                      <p className="text-white/40 text-sm">No guardians added yet</p>
                      <p className="text-white/20 text-xs mt-1">Add at least 3 trusted contacts to enable recovery</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Recovery Tab ── */}
            {activeTab === 'recovery' && (
              <div className="space-y-6">
                {/* Initiate Recovery */}
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-4">Request Wallet Recovery</h3>
                  <p className="text-white/40 text-sm mb-4">Initiate a recovery to transfer ownership to a new address</p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={recoveryNewOwner}
                      onChange={e => setRecoveryNewOwner(e.target.value)}
                      placeholder="New owner address (0x...)"
                      className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm font-mono"
                    />
                    <button
                      onClick={handleRequestRecovery}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-semibold text-sm hover:from-yellow-500 hover:to-orange-500 transition-all"
                    >
                      🔄 Request Recovery
                    </button>
                  </div>
                </div>

                {/* Active Requests */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/60">Active Recovery Requests</h3>
                  {requests.length > 0 ? requests.map(req => (
                    <div key={req.id} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[req.status]}`}>
                            {req.status.toUpperCase()}
                          </span>
                          <span className="text-white/30 text-xs ml-2">ID: {req.id.slice(0, 16)}...</span>
                        </div>
                        <span className="text-white/20 text-xs">
                          Expires: {new Date(req.expiresAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-white/40 text-xs">New Owner</p>
                          <p className="text-sm font-mono">{req.newOwnerAddress.slice(0, 10)}...{req.newOwnerAddress.slice(-8)}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-xs">Votes</p>
                          <p className="text-sm font-medium text-blue-400">{req.votes.filter(v => v.vote === 'approve').length} / {req.requiredVotes}</p>
                        </div>
                      </div>

                      {/* Vote Progress Bar */}
                      <div className="w-full bg-white/[0.05] rounded-full h-2 mb-3">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (req.votes.filter(v => v.vote === 'approve').length / req.requiredVotes) * 100)}%` }}
                        />
                      </div>

                      {/* Votes */}
                      {req.votes.length > 0 && (
                        <div className="space-y-1 mb-3">
                          {req.votes.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span>{v.vote === 'approve' ? '✅' : '❌'}</span>
                              <span className="text-white/50">{v.guardianLabel}</span>
                              <span className="text-white/20 ml-auto">{new Date(v.votedAt).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        {req.status === 'voting' && (
                          <>
                            <button onClick={() => handleVote(req.id, 'approve')} className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium hover:bg-green-600/30 transition-all">
                              ✅ Approve
                            </button>
                            <button onClick={() => handleVote(req.id, 'reject')} className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium hover:bg-red-600/30 transition-all">
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {req.status === 'approved' && (
                          <button onClick={() => handleExecute(req.id)} className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-xs font-medium hover:from-green-500 hover:to-emerald-500 transition-all">
                            🚀 Execute Recovery
                          </button>
                        )}
                        {(req.status === 'voting' || req.status === 'approved') && (
                          <button onClick={() => handleCancel(req.id)} className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white/40 text-xs font-medium hover:text-white/70 transition-all">
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                      <span className="text-4xl block mb-3">🔄</span>
                      <p className="text-white/40 text-sm">No active recovery requests</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Shamir SSS Tab ── */}
            {activeTab === 'shamir' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2">Shamir&apos;s Secret Sharing</h3>
                  <p className="text-white/40 text-sm mb-4">Split your recovery secret into shares distributed among guardians. No single guardian can reconstruct the secret alone.</p>

                  {!shamir ? (
                    <>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                        <p className="text-blue-400 text-xs font-semibold mb-1">How it works:</p>
                        <ul className="text-white/50 text-xs space-y-1">
                          <li>• Your secret is split into {contacts.filter(c => c.status === 'active').length} shares (one per guardian)</li>
                          <li>• Any {shamirThreshold} shares can reconstruct the secret</li>
                          <li>• Fewer than {shamirThreshold} shares reveal nothing</li>
                          <li>• Mathematically proven secure (Shamir, 1979)</li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="text"
                          value={shamirSecret}
                          onChange={e => setShamirSecret(e.target.value)}
                          placeholder="Enter secret (seed phrase, private key, etc.)"
                          className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 text-sm font-mono"
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 text-sm">Threshold:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.max(contacts.length, 2) - 1 }, (_, i) => i + 2).map(n => (
                              <button
                                key={n}
                                onClick={() => setShamirThreshold(n)}
                                disabled={n > contacts.filter(c => c.status === 'active').length}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                  n === shamirThreshold
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.1]'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleSetupShamir}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition-all"
                        >
                          🔐 Generate & Distribute Shares
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-green-400 text-sm font-medium">✅ Shamir SSS Active</p>
                        <p className="text-white/40 text-xs mt-1">{shamir.threshold} of {shamir.totalShares} shares required</p>
                      </div>
                      {shamir.shares.map(share => (
                        <div key={share.id} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-white/40 text-xs">Share #{share.index}</span>
                              <span className="text-white/30 text-xs ml-2">→ {share.guardianAddress.slice(0, 10)}...</span>
                            </div>
                            <code className="text-white/20 text-xs font-mono">{share.share.slice(0, 18)}...</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {history.length > 0 ? history.map(entry => (
                  <div key={entry.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[entry.status as keyof typeof statusColors] || statusColors.pending}`}>
                          {entry.status}
                        </span>
                        <div>
                          <p className="text-sm font-mono">{entry.ownerAddress.slice(0, 10)}...→ {entry.newOwnerAddress.slice(0, 10)}...</p>
                          <p className="text-white/30 text-xs">Votes: {entry.votesReceived}/{entry.votesRequired}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/20 text-xs">{new Date(entry.createdAt).toLocaleDateString()}</p>
                        {entry.completedAt && <p className="text-white/20 text-xs">Completed: {new Date(entry.completedAt).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center">
                    <span className="text-4xl block mb-3">📜</span>
                    <p className="text-white/40 text-sm">No recovery history</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
