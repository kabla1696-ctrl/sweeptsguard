'use client'

import { useState } from 'react'

interface Device {
  id: string
  name: string
  type: 'ledger' | 'trezor' | 'airgap'
  model: string
  firmware: string
  status: 'connected' | 'disconnected' | 'locked'
  accounts: { address: string; chain: string; balance: string }[]
  lastUsed: string
  avatar: string
}

export default function HardwareWalletPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [signMethod, setSignMethod] = useState<'usb' | 'airgap'>('usb')
  const [unsignedTx, setUnsignedTx] = useState('')
  const [signedTx, setSignedTx] = useState('')
  const [signingStep, setSigningStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch devices from API on mount
  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/hardware-wallet')
      const json = await res.json() as { success?: boolean; data?: { devices: Device[] } }
      if (json.success && json.data) {
        setDevices(json.data.devices)
      }
    } catch {
      setError('Failed to load devices')
    } finally {
      setLoading(false)
    }
  }

  useState(() => { fetchDevices() })

  const connectDevice = async (type: string) => {
    try {
      setError('')
      const res = await fetch('/api/hardware-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', deviceType: type }),
      })
      const json = await res.json() as { success?: boolean; data?: Device; error?: string; message?: string }
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to connect device')
        return
      }
      if (json.data) {
        setDevices(prev => [...prev, json.data!])
      }
    } catch {
      setError('Failed to connect device')
    }
  }

  const signTransaction = async () => {
    if (!unsignedTx || !selectedDevice) return
    setSigningStep(1)
    setError('')
    try {
      setSigningStep(2)
      const res = await fetch('/api/hardware-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          deviceId: selectedDevice.id,
          unsignedTx,
        }),
      })
      const json = await res.json() as { success?: boolean; data?: { signedTransaction: string }; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error || 'Signing failed')
        setSigningStep(0)
        return
      }
      setSigningStep(3)
      if (json.data) {
        setSignedTx(json.data.signedTransaction)
      }
    } catch {
      setError('Signing failed')
      setSigningStep(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔐 Hardware Wallet</h1>
          <p className="text-gray-400">Connect Ledger, Trezor, or use air-gapped signing</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span>❌</span> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
          </div>
        )}

        {/* Connect Options */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { type: 'ledger', name: 'Ledger', icon: '🟢', desc: 'Nano S / Nano X / Stax', color: 'green' },
            { type: 'trezor', name: 'Trezor', icon: '⚫', desc: 'Model One / Model T / Safe', color: 'gray' },
            { type: 'airgap', name: 'Air-Gapped', icon: '📱', desc: 'QR-based offline signing', color: 'blue' },
          ].map(d => (
            <button key={d.type} onClick={() => connectDevice(d.type)} className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 hover:border-${d.color}-500 rounded-xl p-6 text-left transition`}>
              <div className="text-3xl mb-2">{d.icon}</div>
              <div className="text-white font-semibold text-lg">{d.name}</div>
              <div className="text-gray-400 text-sm">{d.desc}</div>
            </button>
          ))}
        </div>

        {/* Connected Devices */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">📱 Connected Devices</h2>
            <div className="space-y-3">
              {devices.map(d => (
                <div key={d.id} onClick={() => setSelectedDevice(d)} className={`border rounded-lg p-4 cursor-pointer transition ${selectedDevice?.id === d.id ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{d.avatar}</span>
                      <div>
                        <div className="text-white font-medium">{d.name}</div>
                        <div className="text-gray-400 text-xs">Firmware: {d.firmware}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${d.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {d.accounts.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-400">{a.chain}</span>
                        <span className="text-white font-mono">{a.balance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sign Transaction */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">✍️ Sign Transaction</h2>
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSignMethod('usb')} className={`px-4 py-2 rounded-lg text-sm ${signMethod === 'usb' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>USB Sign</button>
                <button onClick={() => setSignMethod('airgap')} className={`px-4 py-2 rounded-lg text-sm ${signMethod === 'airgap' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Air-Gapped QR</button>
              </div>
              <textarea
                value={unsignedTx}
                onChange={e => setUnsignedTx(e.target.value)}
                placeholder="Paste unsigned transaction hex..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 font-mono text-sm h-24 resize-none"
              />
            </div>

            {signingStep === 0 && (
              <button onClick={signTransaction} disabled={!unsignedTx || !selectedDevice} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium">
                Sign with Hardware Wallet
              </button>
            )}

            {signingStep > 0 && (
              <div className="space-y-3">
                {['📤 Sending to device...', '👆 Please confirm on device...', '✅ Transaction signed!'].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${signingStep > i ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-700/50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${signingStep > i ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                      {signingStep > i ? '✓' : i + 1}
                    </div>
                    <span className={signingStep > i ? 'text-green-400' : 'text-gray-400'}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {signedTx && (
              <div className="mt-4">
                <label className="text-gray-400 text-sm mb-1 block">Signed Transaction:</label>
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 font-mono text-xs text-green-400 break-all">{signedTx}</div>
              </div>
            )}
          </div>
        </div>

        {/* Security Tips */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">🛡️ Hardware Wallet Security Tips</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { tip: 'Always verify addresses on device screen', icon: '👁️' },
              { tip: 'Keep firmware updated to latest version', icon: '🔄' },
              { tip: 'Never share your seed phrase', icon: '🚫' },
              { tip: 'Use passphrase for extra security', icon: '🔑' },
              { tip: 'Buy only from official stores', icon: '🛒' },
              { tip: 'Test with small amounts first', icon: '💰' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-700/30 rounded-lg p-3">
                <span className="text-xl">{t.icon}</span>
                <span className="text-gray-300 text-sm">{t.tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
