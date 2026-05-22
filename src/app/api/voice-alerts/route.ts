import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import {
  createAlert,
  getAlertMessage,
  getSupportedLanguages,
  getAlertTypes,
  getAlertSounds,
  updateVoiceAlertConfig,
  getVoiceAlertConfig,
} from '@/lib/voiceAlert'

interface VoiceAlertRequest {
  action: 'preview' | 'save-preferences' | 'get-preferences'
  text?: string
  language?: string
  voiceId?: string
  speed?: number
  volume?: number
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  let body: VoiceAlertRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (body.action === 'preview') {
      const language = (body.language || 'en') as 'en' | 'bn' | 'hi'
      const previewText = body.text || getAlertMessage('security_scan', language)

      // Create a real alert event using the lib
      const alertEvent = createAlert('security_scan', 'critical', 'Preview Alert', language)

      return NextResponse.json({
        success: true,
        preview: {
          text: previewText,
          message: alertEvent.message,
          language,
          voiceId: body.voiceId || 'aria',
          speed: body.speed || 1.0,
          volume: body.volume || 80,
          utterance: {
            text: alertEvent.message,
            lang: language === 'en' ? 'en-US' : language === 'bn' ? 'bn-BD' : language === 'hi' ? 'hi-IN' : 'en-US',
            rate: body.speed || 1.0,
            volume: (body.volume || 80) / 100,
          },
        },
        message: 'Preview generated. Use Web Speech API on client to play.',
      })
    }

    if (body.action === 'save-preferences') {
      const updates: Record<string, unknown> = {}
      if (body.language) updates.language = body.language
      if (body.speed !== undefined) updates.speed = body.speed
      if (body.volume !== undefined) updates.volume = body.volume

      const config = updateVoiceAlertConfig(updates)

      return NextResponse.json({
        success: true,
        config,
        message: 'Preferences saved successfully.',
      })
    }

    if (body.action === 'get-preferences') {
      return NextResponse.json({
        success: true,
        config: getVoiceAlertConfig(),
        supportedLanguages: getSupportedLanguages(),
        alertTypes: getAlertTypes(),
        sounds: getAlertSounds(),
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Voice alert operation failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    supportedLanguages: getSupportedLanguages(),
    alertTypes: getAlertTypes(),
    sounds: getAlertSounds(),
  })
}
