import { NextRequest, NextResponse } from 'next/server'
import { initSocialRecovery, addContact, removeContact, setThreshold, setupShamir, requestRecovery, voteOnRecovery, executeRecovery, cancelRecovery, getRecoveryConfig, getRecoveryStatus, getHistory } from '@/lib/socialRecovery'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 20, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const address = request.nextUrl.searchParams.get('address')
  const action = request.nextUrl.searchParams.get('action') || 'config'

  try {
    switch (action) {
      case 'config': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const config = initSocialRecovery(address)
        return NextResponse.json(config)
      }
      case 'status': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        const status = getRecoveryStatus(address)
        return NextResponse.json(status)
      }
      case 'history': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
        const history = getHistory(limit)
        return NextResponse.json({ history })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action, ownerAddress, contactAddress, contactLabel, threshold, secret, requestId, guardianAddress, vote, newOwnerAddress, cancellerAddress } = body

    switch (action) {
      case 'add_contact': {
        if (!ownerAddress || !contactAddress) return NextResponse.json({ error: 'Addresses required' }, { status: 400 })
        const contact = addContact(ownerAddress, contactAddress, contactLabel || 'Guardian')
        return NextResponse.json(contact)
      }
      case 'remove_contact': {
        if (!ownerAddress || !contactAddress) return NextResponse.json({ error: 'Addresses required' }, { status: 400 })
        const result = removeContact(ownerAddress, contactAddress)
        return NextResponse.json(result)
      }
      case 'set_threshold': {
        if (!ownerAddress || !threshold) return NextResponse.json({ error: 'Owner and threshold required' }, { status: 400 })
        const result = setThreshold(ownerAddress, threshold)
        return NextResponse.json(result)
      }
      case 'setup_shamir': {
        if (!ownerAddress || !secret) return NextResponse.json({ error: 'Owner and secret required' }, { status: 400 })
        const shares = setupShamir(ownerAddress, secret, threshold)
        return NextResponse.json(shares)
      }
      case 'request_recovery': {
        if (!ownerAddress || !newOwnerAddress) return NextResponse.json({ error: 'Owner and new owner required' }, { status: 400 })
        const req = requestRecovery(ownerAddress, newOwnerAddress, ownerAddress)
        return NextResponse.json(req)
      }
      case 'vote': {
        if (!requestId || !guardianAddress) return NextResponse.json({ error: 'Request ID and guardian required' }, { status: 400 })
        const result = voteOnRecovery(requestId, guardianAddress, vote || 'approve')
        return NextResponse.json(result)
      }
      case 'execute': {
        if (!requestId) return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
        const result = executeRecovery(requestId)
        return NextResponse.json(result)
      }
      case 'cancel': {
        if (!requestId || !cancellerAddress) return NextResponse.json({ error: 'Request ID and canceller required' }, { status: 400 })
        const result = cancelRecovery(requestId, cancellerAddress)
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
