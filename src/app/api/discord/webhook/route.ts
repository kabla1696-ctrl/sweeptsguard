import { NextRequest, NextResponse } from 'next/server'
import { handleDiscordInteraction, registerSlashCommands, type DiscordInteraction } from '@/lib/discordBot'

// Discord uses Ed25519 signature verification for interactions.
// For simplicity, we verify the interaction structure; in production,
// add @noble/ed25519 signature verification with DISCORD_PUBLIC_KEY.

// POST — Handle Discord interactions (slash commands, button clicks)
export async function POST(request: NextRequest) {
  let interaction: DiscordInteraction
  try {
    interaction = (await request.json()) as DiscordInteraction
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Handle PING (type 1) — Discord verification handshake
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 }) // PONG
  }

  // Handle APPLICATION_COMMAND (type 2)
  if (interaction.type === 2) {
    try {
      await handleDiscordInteraction(interaction)
      // Discord expects an immediate 200; we already replied via the interaction token
      return NextResponse.json({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Interaction processing failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
}

// GET — Bot status and setup info
export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN
  const appId = process.env.DISCORD_APPLICATION_ID

  return NextResponse.json({
    ok: true,
    botConfigured: !!token,
    applicationId: appId || null,
    inviteUrl: appId
      ? `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=2147485696&scope=bot%20applications.commands`
      : null,
    note: 'Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID in your environment variables.',
  })
}

// PUT — Register/re-register slash commands with Discord
export async function PUT() {
  const ok = await registerSlashCommands()
  if (ok) {
    return NextResponse.json({ ok: true, message: 'Slash commands registered successfully.' })
  }
  return NextResponse.json({ ok: false, error: 'Failed to register commands. Check DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID.' }, { status: 500 })
}
