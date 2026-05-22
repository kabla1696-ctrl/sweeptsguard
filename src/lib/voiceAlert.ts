// Voice Alert System — multi-language TTS alerts for security events
// Supports Bangla, Hindi, English with customizable tone, speed, and scheduling

import { type Locale, LOCALES } from './i18n'

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertLanguage = 'en' | 'bn' | 'hi'
export type AlertTone = 'urgent' | 'calm' | 'robotic' | 'friendly'
export type AlertPriority = 'critical' | 'high' | 'medium' | 'low'

export interface VoiceAlertConfig {
  language: AlertLanguage
  tone: AlertTone
  speed: number              // 0.5 – 2.0
  volume: number             // 0 – 100
  enabled: boolean
  schedule: AlertSchedule
  criticalCallEnabled: boolean  // voice call for critical alerts
  phoneNumber?: string
}

export interface AlertSchedule {
  quietHoursStart: string    // "22:00"
  quietHoursEnd: string      // "08:00"
  quietHoursEnabled: boolean
  activeDays: number[]       // 0=Sun, 1=Mon, …, 6=Sat
}

export interface VoiceAlertEvent {
  id: string
  type: AlertEventType
  priority: AlertPriority
  title: string
  message: string
  timestamp: number
  language: AlertLanguage
  played: boolean
}

export type AlertEventType =
  | 'wallet_drain'
  | 'suspicious_approval'
  | 'phishing_detected'
  | 'large_transfer'
  | 'new_device_login'
  | 'contract_interaction'
  | 'sweep_success'
  | 'sweep_failed'
  | 'price_alert'
  | 'security_scan'

export interface AlertSound {
  id: string
  name: string
  emoji: string
  category: 'alarm' | 'notification' | 'chime' | 'voice'
  url?: string
}

// ── Alert sounds library ─────────────────────────────────────────────────────

export const ALERT_SOUNDS: AlertSound[] = [
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

// ── Translations for voice alerts ────────────────────────────────────────────

interface AlertTranslations {
  [key: string]: { en: string; bn: string; hi: string }
}

const ALERT_MESSAGES: AlertTranslations = {
  wallet_drain: {
    en: 'Critical alert! Unauthorized fund transfer detected from your wallet. Immediate action required.',
    bn: 'জরুরী সতর্কতা! আপনার ওয়ালেট থেকে অনুমোদনহীন তহবিল স্থানান্তর সনাক্ত হয়েছে। তাৎক্ষণিক পদক্ষেপ প্রয়োজন।',
    hi: 'गंभीर चेतावनी! आपके वॉलेट से अनधिकृत फंड ट्रांसफर का पता चला। तत्काल कार्रवाई आवश्यक।',
  },
  suspicious_approval: {
    en: 'Warning! A suspicious token approval has been detected. Review and revoke if unauthorized.',
    bn: 'সতর্কতা! একটি সন্দেহজনক টোকন অনুমোদন সনাক্ত হয়েছে। পর্যালোচনা করুন এবং অনুমোদন প্রত্যাহার করুন।',
    hi: 'चेतावनी! एक संदिग्ध टोकन अनुमोदन का पता चला। समीक्षा करें और अनधिकृत होने पर रद्द करें।',
  },
  phishing_detected: {
    en: 'Danger! Phishing attempt detected. Do not click any links or share your seed phrase.',
    bn: 'বিপদ! ফিশিং প্রচেষ্টা সনাক্ত হয়েছে। কোনো লিঙ্কে ক্লিক করবেন না বা সিড ফ্রেজ শেয়ার করবেন না।',
    hi: 'खतरा! फ़िशिंग का प्रयास पाया गया। किसी लिंक पर क्लिक न करें या अपना सीड फ़्रेज़ साझा न करें।',
  },
  large_transfer: {
    en: 'Notice. A large transfer has been detected on your wallet. Please verify this transaction.',
    bn: 'বিজ্ঞপ্তি। আপনার ওয়ালেটে একটি বড় লেনদেন সনাক্ত হয়েছে। অনুগ্রহ করে যাচাই করুন।',
    hi: 'सूचना। आपके वॉलेट पर एक बड़ा ट्रांसफर पाया गया। कृपया इस लेनदेन को सत्यापित करें।',
  },
  new_device_login: {
    en: 'Alert. A new device has accessed your account. If this was not you, secure your wallet immediately.',
    bn: 'সতর্কতা। একটি নতুন ডিভাইস আপনার অ্যাকাউন্টে প্রবেশ করেছে। আপনি না হলে, তাৎক্ষণিক আপনার ওয়ালেট নিরাপদ করুন।',
    hi: 'चेतावनी। एक नए डिवाइस ने आपके खाते तक पहुंच बनाई। यदि आप नहीं थे, तो तुरंत अपना वॉलेट सुरक्षित करें।',
  },
  contract_interaction: {
    en: 'Notice. Your wallet interacted with a smart contract. Review the transaction details.',
    bn: 'বিজ্ঞপ্তি। আপনার ওয়ালেট একটি স্মার্ট কন্ট্র্যাক্টের সাথে যোগাযোগ করেছে। লেনদেনের বিবরণ পর্যালোচনা করুন।',
    hi: 'सूचना। आपके वॉलेट ने स्मार्ट कॉन्ट्रैक्ट के साथ बातचीत की। लेनदेन विवरण की समीक्षा करें।',
  },
  sweep_success: {
    en: 'Success! Funds have been swept to your safe wallet. Your assets are protected.',
    bn: 'সফল! তহবিল আপনার নিরাপদ ওয়ালেটে স্থানান্তরিত হয়েছে। আপনার সম্পদ সুরক্ষিত।',
    hi: 'सफल! फंड आपके सुरक्षित वॉलेट में स्थानांतरित हो गए हैं। आपकी संपत्ति सुरक्षित है।',
  },
  sweep_failed: {
    en: 'Alert! Fund sweep failed. Manual intervention may be required. Check your dashboard.',
    bn: 'সতর্কতা! তহবিল স্থানান্তর ব্যর্থ হয়েছে। ম্যানুয়াল হস্তক্ষেপ প্রয়োজন হতে পারে।',
    hi: 'चेतावनी! फंड स्वीप विफल रहा। मैन्युअल हस्तक्षेप आवश्यक हो सकता है।',
  },
  price_alert: {
    en: 'Price alert triggered. Check your portfolio for the latest updates.',
    bn: 'মূল্য সতর্কতা ট্রিগার হয়েছে। সর্বশেষ আপডেটের জন্য আপনার পোর্টফোলিও দেখুন।',
    hi: 'मूल्य चेतावनी ट्रिगर हुई। नवीनतम अपडेट के लिए अपना पोर्टफोलियो देखें।',
  },
  security_scan: {
    en: 'Security scan complete. Review your dashboard for any findings.',
    bn: 'নিরাপত্তা স্ক্যান সম্পন্ন। কোনো ফলাফলের জন্য আপনার ড্যাশবোর্ড দেখুন।',
    hi: 'सुरक्षा स्कैन पूर्ण। किसी भी निष्कर्ष के लिए अपना डैशबोर्ड देखें।',
  },
}

// ── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: VoiceAlertConfig = {
  language: 'en',
  tone: 'urgent',
  speed: 1.0,
  volume: 80,
  enabled: true,
  schedule: {
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursEnabled: true,
    activeDays: [0, 1, 2, 3, 4, 5, 6],
  },
  criticalCallEnabled: false,
}

// ── State ────────────────────────────────────────────────────────────────────

let config: VoiceAlertConfig = { ...DEFAULT_CONFIG }
const alertHistory: VoiceAlertEvent[] = []
let audioContext: AudioContext | null = null

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get current voice alert config
 */
export function getVoiceAlertConfig(): VoiceAlertConfig {
  return { ...config }
}

/**
 * Update voice alert config
 */
export function updateVoiceAlertConfig(partial: Partial<VoiceAlertConfig>): VoiceAlertConfig {
  config = { ...config, ...partial }
  return { ...config }
}

/**
 * Get localized alert message
 */
export function getAlertMessage(type: AlertEventType, lang: AlertLanguage = config.language): string {
  return ALERT_MESSAGES[type]?.[lang] || ALERT_MESSAGES[type]?.['en'] || 'Security alert.'
}

/**
 * Get all supported alert languages
 */
export function getSupportedLanguages(): { code: AlertLanguage; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'bn', name: 'Bangla', nativeName: 'বাংলা' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ]
}

/**
 * Check if we're in quiet hours
 */
export function isInQuietHours(): boolean {
  if (!config.schedule.quietHoursEnabled) return false
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const current = hours * 60 + minutes

  const [startH, startM] = config.schedule.quietHoursStart.split(':').map(Number)
  const [endH, endM] = config.schedule.quietHoursEnd.split(':').map(Number)
  const start = startH * 60 + startM
  const end = endH * 60 + endM

  if (start <= end) return current >= start && current < end
  return current >= start || current < end // wraps midnight
}

/**
 * Check if today is an active alert day
 */
export function isActiveDay(): boolean {
  return config.schedule.activeDays.includes(new Date().getDay())
}

/**
 * Create and queue a voice alert event
 */
export function createAlert(
  type: AlertEventType,
  priority: AlertPriority,
  title: string,
  lang?: AlertLanguage
): VoiceAlertEvent {
  const alert: VoiceAlertEvent = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    priority,
    title,
    message: getAlertMessage(type, lang || config.language),
    timestamp: Date.now(),
    language: lang || config.language,
    played: false,
  }
  alertHistory.unshift(alert)
  if (alertHistory.length > 200) alertHistory.pop()
  return alert
}

/**
 * Play a voice alert using Web Speech API (browser TTS)
 */
export async function playAlert(alert: VoiceAlertEvent): Promise<boolean> {
  if (!config.enabled) return false
  if (isInQuietHours() && alert.priority !== 'critical') return false
  if (!isActiveDay()) return false

  if (typeof window === 'undefined' || !window.speechSynthesis) return false

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(alert.message)

    // Set language
    const langMap: Record<AlertLanguage, string> = { en: 'en-US', bn: 'bn-BD', hi: 'hi-IN' }
    utterance.lang = langMap[alert.language] || 'en-US'

    // Set rate (speed)
    utterance.rate = config.speed

    // Set volume
    utterance.volume = config.volume / 100

    // Adjust pitch based on tone
    switch (config.tone) {
      case 'urgent': utterance.pitch = 1.3; break
      case 'calm': utterance.pitch = 0.8; break
      case 'robotic': utterance.pitch = 0.5; break
      case 'friendly': utterance.pitch = 1.1; break
    }

    utterance.onend = () => {
      alert.played = true
      resolve(true)
    }
    utterance.onerror = () => resolve(false)

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Play a notification sound using Web Audio API
 */
export function playSound(soundId: string): boolean {
  if (!config.enabled) return false

  try {
    if (!audioContext) audioContext = new AudioContext()
    const ctx = audioContext

    // Generate a simple tone based on sound ID
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    const freqMap: Record<string, number> = {
      'critical-alarm': 880,
      'security-breach': 660,
      'soft-chime': 523,
      'digital-ping': 1047,
      'gentle-notice': 440,
      'robot-voice': 220,
      'whisper-alert': 330,
      'double-tap': 800,
      'siren': 1200,
      'coin-drop': 1400,
    }

    oscillator.frequency.value = freqMap[soundId] || 523
    oscillator.type = soundId === 'robot-voice' ? 'sawtooth' : soundId === 'siren' ? 'square' : 'sine'

    gainNode.gain.value = config.volume / 100 * 0.3
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.5)

    return true
  } catch {
    return false
  }
}

/**
 * Get alert history
 */
export function getAlertHistory(limit = 50): VoiceAlertEvent[] {
  return alertHistory.slice(0, limit)
}

/**
 * Trigger a critical voice call (placeholder — production would use Twilio/etc.)
 */
export async function triggerCriticalCall(alert: VoiceAlertEvent): Promise<boolean> {
  if (!config.criticalCallEnabled || !config.phoneNumber) return false
  if (alert.priority !== 'critical') return false

  // In production: POST to /api/voice-call with Twilio/Vonage
  console.log(`[VoiceAlert] Critical call would be placed to ${config.phoneNumber}`)
  return true
}

/**
 * Get available alert sounds
 */
export function getAlertSounds(): AlertSound[] {
  return ALERT_SOUNDS
}

/**
 * Get alert event type metadata
 */
export function getAlertTypes(): { type: AlertEventType; label: string; emoji: string; defaultPriority: AlertPriority }[] {
  return [
    { type: 'wallet_drain', label: 'Wallet Drain', emoji: '🚨', defaultPriority: 'critical' },
    { type: 'suspicious_approval', label: 'Suspicious Approval', emoji: '⚠️', defaultPriority: 'high' },
    { type: 'phishing_detected', label: 'Phishing Detected', emoji: '🎣', defaultPriority: 'critical' },
    { type: 'large_transfer', label: 'Large Transfer', emoji: '💰', defaultPriority: 'medium' },
    { type: 'new_device_login', label: 'New Device Login', emoji: '📱', defaultPriority: 'high' },
    { type: 'contract_interaction', label: 'Contract Interaction', emoji: '📜', defaultPriority: 'low' },
    { type: 'sweep_success', label: 'Sweep Success', emoji: '✅', defaultPriority: 'low' },
    { type: 'sweep_failed', label: 'Sweep Failed', emoji: '❌', defaultPriority: 'high' },
    { type: 'price_alert', label: 'Price Alert', emoji: '📈', defaultPriority: 'low' },
    { type: 'security_scan', label: 'Security Scan', emoji: '🔍', defaultPriority: 'low' },
  ]
}
