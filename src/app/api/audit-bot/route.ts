import { NextRequest, NextResponse } from 'next/server'
import { auditContract, getAuditHistory } from '@/lib/contractAudit'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'history'
  const address = request.nextUrl.searchParams.get('address')
  const chainId = parseInt(request.nextUrl.searchParams.get('chainId') || '1', 10)

  try {
    switch (action) {
      case 'history':
        return NextResponse.json({ history: getAuditHistory() })
      case 'audit': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const report = await auditContract(address, chainId)
        return NextResponse.json(report)
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
