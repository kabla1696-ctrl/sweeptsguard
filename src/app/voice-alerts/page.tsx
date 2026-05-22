'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
]

const VOICE_PRESETS = [
  { id: 'aria', name: 'Aria', style: 'Professional, clear', gender: 'Female' },
  { id: 'marcus', name: 'Marcus', style: 'Deep, authoritative', gender: 'Male' },
  { id: 'nova', name: 'Nova', style: 'Warm, friendly', gender: 'Female' },
  { id: 'atlas', name: 'Atlas', style: 'Calm, reassuring', gender: 'Male' },
]

const ALERT_TYPES = [
  { id: 'hack', label: 'Hack Detected', icon: '🔓', enabled: true, urgency: 'critical' },
  { id: 'drain', label: 'Balance Drain', icon: '💸', enabled: true, urgency: 'critical' },
  { id: 'whale', label: 'Whale Movement', icon: '🐋', enabled: false, urgency: 'medium' },
  { id: 'gas', label: 'Gas Spike', icon: '⛽', enabled: false, urgency: 'low' },
  { id: 'approval', label: 'Suspicious Approval', icon: '⚠️', enabled: true, urgency: 'high' },
  { id: 'liquidation', label: 'Liquidation Risk', icon: '📊', enabled: true, urgency: 'high' },
]

const URGENCY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  hi: 'hi-IN',
  bn: 'bn-BD',
}

export default function VoiceAlertsPage() {
  const [language, setLanguage] = useState('en')
  const [voice, setVoice] = useState('aria')
  const [previewing, setPreviewing] = useState(false)
  const [alerts, setAlerts] = useState(ALERT_TYPES)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handlePreview = useCallback(async () => {
    setPreviewing(true)
    setSaveMessage(null)

    try {
      // Call the API to get the preview text
      const response = await fetch('/api/voice-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          language,
          voiceId: voice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed')
      }

      // Use Web Speech API for actual TTS playback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(data.preview.message || data.preview.text)
        utterance.lang = data.preview.utterance?.lang || LANG_MAP[language] || 'en-US'
        utterance.rate = data.preview.utterance?.rate || 1.0
        utterance.volume = data.preview.utterance?.volume || 0.8

        // Adjust pitch based on voice preset
        switch (voice) {
          case 'aria': utterance.pitch = 1.1; break
          case 'marcus': utterance.pitch = 0.7; break
          case 'nova': utterance.pitch = 1.2; break
          case 'atlas': utterance.pitch = 0.9; break
          default: utterance.pitch = 1.0
        }

        utterance.onend = () => setPreviewing(false)
        utterance.onerror = () => setPreviewing(false)

        window.speechSynthesis.cancel() // Cancel any ongoing speech
        window.speechSynthesis.speak(utterance)

        // Fallback timeout in case onend doesn't fire
        setTimeout(() => setPreviewing(false), 10000)
      } else {
        // Web Speech API not available
        setSaveMessage('Web Speech API not available in this browser')
        setPreviewing(false)
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Preview failed')
      setPreviewing(false)
    }
  }, [language, voice])

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/voice-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-preferences',
          language,
          speed: 1.0,
          volume: 80,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Save failed')
      }

      setSaveMessage('Preferences saved successfully!')
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#050507] via-[#0a0a0f] to-[#050507] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#00ff87]/5 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-[#00ff87] to-[#00e5ff] bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-6">
          <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/80 transition-colors">Dashboard</Link>
          <Link href="/voice-alerts" className="text-sm text-indigo-400 font-semibold">Voice Alerts</Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Audio Notifications
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Voice</span>{' '}
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Alerts</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Get spoken alerts in your language. Never miss a critical threat.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-indigo-400">🌍</span> Language
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                      language === l.code
                        ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
                        : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:border-white/[0.12]'
                    }`}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-purple-400">🎤</span> Voice
              </h2>
              <div className="space-y-3">
                {VOICE_PRESETS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                      voice === v.id
                        ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                        : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{v.gender === 'Female' ? '👩' : '👨'}</span>
                      <div className="text-left">
                        <div className="font-medium">{v.name}</div>
                        <div className="text-xs text-white/30">{v.style}</div>
                      </div>
                    </div>
                    {voice === v.id && <span className="text-indigo-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePreview}
              disabled={previewing}
              className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-300 disabled:opacity-50"
            >
              {previewing ? '🔊 Playing Preview...' : '🔊 Preview Voice'}
            </button>

            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/[0.15] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Preferences'}
            </button>

            {saveMessage && (
              <div className={`p-3 rounded-xl text-sm text-center ${saveMessage.includes('success') || saveMessage.includes('saved') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {saveMessage}
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-[#00ff87]">🔔</span> Alert Types
            </h2>
            <div className="space-y-3">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 hover:border-white/[0.08] transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <span className="text-sm font-medium text-white/80">{a.label}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] border ${URGENCY_COLORS[a.urgency]}`}>
                        {a.urgency}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAlert(a.id)}
                    className={`w-12 h-6 rounded-full transition-all ${a.enabled ? 'bg-[#00ff87]' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${a.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <h3 className="text-sm font-semibold mb-3 text-white/60">🎵 Sound Library</h3>
              <div className="grid grid-cols-3 gap-2">
                {['Alert', 'Chime', 'Siren', 'Bell', 'Ping', 'Buzz'].map(s => (
                  <button key={s} className="px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white/40 hover:text-white/60 hover:border-white/[0.12] transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
