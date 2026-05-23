import { NextRequest, NextResponse } from 'next/server'
import { processUpdate, type TelegramUpdate } from '@/lib/telegramBot'

// POST — Handle incoming Telegram webhook updates
export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as TelegramUpdate

    // Validate basic structure
    if (!update.update_id) {
      return NextResponse.json({ error: 'Invalid update: missing update_id' }, { status: 400 })
    }

    // Process the update (commands, messages, etc.)
    await processUpdate(update)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — Webhook status / health check
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://sweeptsguard.vercel.app/api/telegram/webhook'

  return NextResponse.json({
    ok: true,
    botConfigured: !!token,
    webhookUrl,
    note: 'Set webhook via: POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=' + encodeURIComponent(webhookUrl),
  })
}
