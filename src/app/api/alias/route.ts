import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'

interface Alias {
  alias: string
  address: string
  verified: boolean
  created: string
}

// In-memory store
const aliases = new Map<string, Alias>()

// Seed data
const seedAliases: Alias[] = [
  { alias: 'alice.eth', address: '0x1234567890abcdef1234567890abcdef12345678', verified: true, created: '2026-01-15' },
  { alias: 'bob.wallet', address: '0xabcdef1234567890abcdef1234567890abcdef12', verified: true, created: '2026-02-20' },
  { alias: 'treasury', address: '0x9876543210fedcba9876543210fedcba98765432', verified: false, created: '2026-03-10' },
]
seedAliases.forEach(a => aliases.set(a.alias, a))

const ALIAS_REGEX = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/
const MAX_ALIASES = 200

/**
 * GET /api/alias — list all aliases or lookup by name
 * Query params: ?name=alice.eth (optional, for lookup)
 */
export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name')

    if (name) {
      // Lookup specific alias
      const alias = aliases.get(name.toLowerCase().trim())
      if (!alias) {
        return NextResponse.json({ error: 'Alias not found' }, { status: 404 })
      }
      return NextResponse.json({ alias })
    }

    // List all
    return NextResponse.json({ aliases: Array.from(aliases.values()) })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/alias — register or delete an alias
 * Body: { action: 'register' | 'delete', ... }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }

  try {
    switch (action) {
      case 'register': {
        const { name, address } = body as { name?: string; address?: string }

        if (!name || typeof name !== 'string') {
          return NextResponse.json({ error: 'Alias name is required' }, { status: 400 })
        }
        const normalizedName = name.toLowerCase().trim()
        if (!ALIAS_REGEX.test(normalizedName)) {
          return NextResponse.json({ error: 'Alias must be 3-64 chars: lowercase alphanumeric, dots, hyphens, underscores. Must start/end with alphanumeric.' }, { status: 400 })
        }
        if (!address || !isValidAddress(address)) {
          return NextResponse.json({ error: 'Valid Ethereum address required' }, { status: 400 })
        }
        if (aliases.has(normalizedName)) {
          return NextResponse.json({ error: 'Alias already taken' }, { status: 409 })
        }
        if (aliases.size >= MAX_ALIASES) {
          return NextResponse.json({ error: `Maximum ${MAX_ALIASES} aliases allowed` }, { status: 429 })
        }

        const alias: Alias = {
          alias: normalizedName,
          address: address.trim(),
          verified: false,
          created: new Date().toISOString().split('T')[0],
        }
        aliases.set(normalizedName, alias)
        return NextResponse.json({ alias }, { status: 201 })
      }

      case 'delete': {
        const { name } = body as { name?: string }
        if (!name || typeof name !== 'string') {
          return NextResponse.json({ error: 'Alias name is required' }, { status: 400 })
        }
        const normalizedName = name.toLowerCase().trim()
        if (!aliases.has(normalizedName)) {
          return NextResponse.json({ error: 'Alias not found' }, { status: 404 })
        }
        aliases.delete(normalizedName)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action. Use: register, delete' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
