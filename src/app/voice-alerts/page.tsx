'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type AlertLanguage = 'en' | 'bn' | 'hi'
type AlertTone = 'urgent' | 'calm' | 'robotic' | 'friendly'

interface VoiceAlertEvent {
  id: string
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  timestamp: number
  language: AlertLanguage
  played: boolean
}

const ALERT_SOUNDS = [
  { id: 'critical-alarm', name: 'Critical Alarm', emoji: '🚨', category: 'alarm' },
  { id: 'security-breach', name: 'Security Breach', emoji: '⚠️', category: 'alarm' },
  { id: 'soft-chime', name: 'Soft Chime', emoji: '🔔', category: 'chime' },
  { id: 'digital-ping', name: 'Digital Ping', emoji: '📱', category: 'notification' },
  { id: 'gentle-notice', name: 'Gentle Notice', emoji: '💬', category: 'notification' },
  { id: 'robot-voice', name: 'Robot Voice', emoji: '🤖', category: 'voice' },
  { id: 'whisper-alert', name: 'Whisper Alert', emoji: '🤫', category: 'voice' },
  { id: 'double-tap', name: 'Double Tap', emoji: '👏', category: 'chime' },
  { id: 'siren', name: 'Siren', emoji: '🚑', category: 'alarm' },
  { id: 'coin-drop', name: 'Coin Drop', emoji: '🪙', category: 'notification' },
]

const ALERT_TYPES = [
  { type: 'wallet_drain', label: 'Wallet Drain', emoji: '🚨', priority: 'critical' as const },
  { type: 'suspicious_approval', label: 'Suspicious Approval', emoji: '⚠️', priority: 'high' as const },
  { type: 'phishing_detected', label: 'Phishing Detected', emoji: '🎣', priority: 'critical' as const },
  { type: 'large_transfer', label: 'Large Transfer', emoji: '💰', priority: 'medium' as const },
  { type: 'new_device_login', label: 'New Device Login', emoji: '📱', priority: 'high' as const },
  { type: 'contract_interaction', label: 'Contract Interaction', emoji: '📜', priority: 'low' as const },
  { type: 'sweep_success', label: 'Sweep Success', emoji: '✅', priority: 'low' as const },
  { type: 'sweep_failed', label: 'Sweep Failed', emoji: '❌', priority: 'high' as const },
  { type: 'price_alert', label: 'Price Alert', emoji: '📈', priority: 'low' as const },
  { type: 'security_scan', label: 'Security Scan', emoji: '🔍', priority: 'low' as const },
]

const SAMPLE_MESSAGES: Record<AlertLanguage, Record<string, string>> = {
  en: {
    wallet_drain: 'Critical alert! Unauthorized fund transfer detected from your wallet. Immediate action required.',
    suspicious_approval: 'Warning! A suspicious token approval has been detected. Review and revoke if unauthorized.',
    phishing_detected: 'Danger! Phishing attempt detected. Do not click any links or share your seed phrase.',
    sweep_success: 'Success! Funds have been swept to your safe wallet. Your assets are protected.',
  },
  bn: {
    wallet_drain: 'জরুরী সতর্কতা! আপনার ওয়ালেট থেকে অনুমোদনহীন তহবিল স্থানান্তর সনাক্ত হয়েছে। তাৎক্ষণিক পদক্ষেপ প্রয়োজন।',
    suspicious_approval: 'সতর্কতা! একটি সন্দেহজনক টোকন অনুমোদন সনাক্ত হয়েছে। পর্যালোচনা করুন।',
    phishing_detected: 'বিপদ! ফিশিং প্রচেষ্টা সনাক্ত হয়েছে। কোনো লিঙ্কে ক্লিক করবেন না।',
    sweep_success: 'সফল! তহবিল আপনার নিরাপদ ওয়ালেটে স্থানান্তরিত হয়েছে।',
  },
  hi: {
    wallet_drain: 'गंभीर चेतावनी! आपके वॉलेट से अनधिकृत फंड ट्रांसफर का पता चला। तत्काल कार्रवाई आवश्यक।',
    suspicious_approval: 'चेतावनी! एक संदिग्ध टोकन अनुमोदन का पता चला। समीक्षा करें।',
    phishing_detected: 'खतरा! फ़िशिंग का प्रयास पाया गया। किसी लिंक पर क्लिक न करें।',
    sweep_success: 'सफल! फंड आपके सुरक्षित वॉलेट में स्थानांतरित हो गए हैं।',
  },
}

export default function VoiceAlertsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'preview' | 'sounds' | 'history'>('settings')

  // Config state
  const [language, setLanguage] = useState<AlertLanguage>('en')
  const [tone, setTone] = useState<AlertTone>('urgent')
  const [speed, setSpeed] = useState(1.0)
  const [volume, setVolume] = useState(80)
  const [enabled, setEnabled] = useState(true)
  const [criticalCallEnabled, setCriticalCallEnabled] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('08:00')
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  // Preview state
  const [previewType, setPreviewType] = useState('wallet_drain')
  const [speaking, setSpeaking] = useState(false)

  // History
  const [history] = useState<VoiceAlertEvent[]>([
    { id: '1', type: 'wallet_drain', priority: 'critical', title: 'Wallet Drain', message: 'Unauthorized transfer detected', timestamp: Date.now() - 3600000, language: 'en', played: true },
    { id: '2', type: 'sweep_success', priority: 'low', title: 'Sweep Success', message: 'Funds swept to safety', timestamp: Date.now() - 7200000, language: 'en', played: true },
    { id: '3', type: 'phishing_detected', priority: 'critical', title: 'Phishing Detected', message: 'Phishing attempt blocked', timestamp: Date.now() - 86400000, language: 'bn', played: true },
  ])

  const [selectedSound, setSelectedSound] = useState('critical-alarm')
  const [soundPlaying, setSoundPlaying] = useState<string | null>(null)

  const handlePreview = useCallback(async () => {
    const message = SAMPLE_MESSAGES[language]?.[previewType] || 'Security alert.'
    setSpeaking(true)

    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(message)
        const langMap: Record<AlertLanguage, string> = { en: 'en-US', bn: 'bn-BD', hi: 'hi-IN' }
        utterance.lang = langMap[language]
        utterance.rate = speed
        utterance.volume = volume / 100
        switch (tone) {
          case 'urgent': utterance.pitch = 1.3; break
          case 'calm': utterance.pitch = 0.8; break
          case 'robotic': utterance.pitch = 0.5; break
          case 'friendly': utterance.pitch = 1.1; break
        }
        utterance.onend = () => setSpeaking(false)
        utterance.onerror = () => setSpeaking(false)
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      setSpeaking(false)
    }
  }, [language, previewType, speed, volume, tone])

  const playSound = useCallback((soundId: string) => {
    setSoundPlaying(soundId)
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const freqMap: Record<string, number> = {
        'critical-alarm': 880, 'security-breach': 660, 'soft-chime': 523,
        'digital-ping': 1047, 'gentle-notice': 440, 'robot-voice': 220,
        'whisper-alert': 330, 'double-tap': 800, 'siren': 1200, 'coin-drop': 1400,
      }
      osc.frequency.value = freqMap[soundId] || 523
      osc.type = soundId === 'robot-voice' ? 'sawtooth' : soundId === 'siren' ? 'square' : 'sine'
      gain.gain.value = (volume / 100) * 0.3
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
      setTimeout(() => setSoundPlaying(null), 500)
    } catch {
      setSoundPlaying(null)
    }
  }, [volume])

  const toggleDay = (day: number) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return 'text-red-400 bg-red-500/10'
      case 'high': return 'text-orange-400 bg-orange-500/10'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10'
      default: return 'text-green-400 bg-green-500/10'
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto border-b border-white/[0.05]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/scan" className="text-sm text-white/50 hover:text-white">Scan</Link>
          <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Voice Alerts</span>
          </h1>
          <p className="text-white/40">Configure voice notifications for security events. Supports Bangla, Hindi, and English.</p>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔊</span>
            <div>
              <span className="text-sm font-medium">Voice Alerts</span>
              <p className="text-xs text-white/30">{enabled ? 'Active — you will hear voice notifications' : 'Disabled — silent mode'}</p>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-green-500' : 'bg-white/10'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${enabled ? 'left-[26px]' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
          {(['settings', 'preview', 'sounds', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'settings' ? '⚙️ Settings' : tab === 'preview' ? '🗣️ Preview' : tab === 'sounds' ? '🎵 Sounds' : '📋 History'}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Language */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">🌐 Language</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: 'en' as const, name: 'English', flag: '🇺🇸' },
                  { code: 'bn' as const, name: 'বাংলা', flag: '🇧🇩' },
                  { code: 'hi' as const, name: 'हिन्दी', flag: '🇮🇳' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`p-3 rounded-xl text-sm transition-all ${
                      language === lang.code
                        ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'
                    }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone & Speed */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">🎛️ Voice Settings</h3>
              <div>
                <label className="block text-xs text-white/30 mb-2">Tone</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['urgent', 'calm', 'robotic', 'friendly'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`p-2 rounded-lg text-xs transition-all ${
                        tone === t
                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400'
                          : 'bg-white/[0.03] border border-white/[0.06] text-white/40'
                      }`}
                    >
                      {t === 'urgent' ? '🔴' : t === 'calm' ? '🟢' : t === 'robotic' ? '🤖' : '😊'} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-2">Speed: {speed.toFixed(1)}x</label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={speed}
                  onChange={e => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-white/20 mt-1">
                  <span>0.5x Slow</span>
                  <span>1.0x Normal</span>
                  <span>2.0x Fast</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/30 mb-2">Volume: {volume}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={volume}
                  onChange={e => setVolume(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">🕐 Quiet Hours</h3>
                <button
                  onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  className={`w-10 h-5 rounded-full transition-all relative ${quietHoursEnabled ? 'bg-purple-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${quietHoursEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {quietHoursEnabled && (
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-white/30 mb-1">Start</label>
                    <input
                      type="time"
                      value={quietStart}
                      onChange={e => setQuietStart(e.target.value)}
                      className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/40"
                    />
                  </div>
                  <span className="text-white/20 mt-4">→</span>
                  <div>
                    <label className="block text-xs text-white/30 mb-1">End</label>
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={e => setQuietEnd(e.target.value)}
                      className="px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/40"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-white/30 mb-2">Active Days</label>
                <div className="flex gap-2">
                  {dayNames.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium transition-all ${
                        activeDays.includes(i)
                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400'
                          : 'bg-white/[0.03] border border-white/[0.06] text-white/20'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Critical Call */}
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">📞 Critical Voice Call</h3>
                  <p className="text-xs text-white/30 mt-1">Receive a phone call for critical security events</p>
                </div>
                <button
                  onClick={() => setCriticalCallEnabled(!criticalCallEnabled)}
                  className={`w-10 h-5 rounded-full transition-all relative ${criticalCallEnabled ? 'bg-red-500' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${criticalCallEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {criticalCallEnabled && (
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/40 text-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              <h3 className="text-sm font-semibold">Test Voice Alert</h3>
              <p className="text-xs text-white/30">Select an alert type and preview how it sounds with your current settings.</p>

              <div>
                <label className="block text-xs text-white/30 mb-2">Alert Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALERT_TYPES.slice(0, 6).map(at => (
                    <button
                      key={at.type}
                      onClick={() => setPreviewType(at.type)}
                      className={`p-3 rounded-xl text-left text-sm transition-all ${
                        previewType === at.type
                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-400'
                          : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'
                      }`}
                    >
                      {at.emoji} {at.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/[0.03] rounded-xl">
                <p className="text-xs text-white/30 mb-1">Message preview ({language.toUpperCase()}):</p>
                <p className="text-sm text-white/60">{SAMPLE_MESSAGES[language]?.[previewType] || 'No preview available.'}</p>
              </div>

              <button
                onClick={handlePreview}
                disabled={speaking || !enabled}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
              >
                {speaking ? '🔊 Speaking...' : '🗣️ Play Voice Alert'}
              </button>

              {speaking && (
                <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: `${12 + Math.random() * 16}px`, animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                  <span>Playing in {language === 'bn' ? 'বাংলা' : language === 'hi' ? 'हिन्दी' : 'English'}...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sounds Tab */}
        {activeTab === 'sounds' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/30 mb-2">Alert Sound Library</h3>
            {ALERT_SOUNDS.map(sound => (
              <div
                key={sound.id}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  selectedSound === sound.id
                    ? 'bg-purple-600/10 border border-purple-500/20'
                    : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sound.emoji}</span>
                  <div>
                    <span className="text-sm font-medium">{sound.name}</span>
                    <p className="text-xs text-white/30">{sound.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playSound(sound.id)}
                    className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs hover:bg-white/[0.08] transition-all"
                  >
                    {soundPlaying === sound.id ? '🔊' : '▶️'}
                  </button>
                  <button
                    onClick={() => setSelectedSound(sound.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      selectedSound === sound.id
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                        : 'bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/60'
                    }`}
                  >
                    {selectedSound === sound.id ? '✓ Selected' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white/30">Recent Alerts</h3>
              <span className="text-xs text-white/20">{history.length} events</span>
            </div>
            {history.length === 0 ? (
              <div className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center">
                <p className="text-white/30 text-sm">No voice alerts triggered yet.</p>
              </div>
            ) : (
              history.map(event => (
                <div key={event.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(event.priority)}`}>
                        {event.priority}
                      </span>
                      <span className="text-sm font-medium">{event.title}</span>
                    </div>
                    <span className="text-xs text-white/20">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">{event.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-white/20">{event.language.toUpperCase()}</span>
                    {event.played && <span className="text-xs text-green-400/60">✓ Played</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
