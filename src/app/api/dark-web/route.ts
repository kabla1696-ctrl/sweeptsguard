import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { DarkWebMonitorEngine } from '@/lib/darkWebMonitor'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'scan'
  const address = request.nextUrl.searchParams.get('address')
  const email = request.nextUrl.searchParams.get('email')

  try {
    switch (action) {
      case 'scan': {
        if (!address && !email) return NextResponse.json({ error: 'Address or email required' }, { status: 400 })
        const target = address || email!
        if (address && !isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const monitor = new DarkWebMonitorEngine(target)
        const result = await monitor.scan()
        return NextResponse.json(result)
      }
      case 'breaches': {
        const monitor = new DarkWebMonitorEngine(address || '0x0000000000000000000000000000000000000000')
        await monitor.scan()
        const breaches = monitor.getBreaches()
        return NextResponse.json({ breaches })
      }
      case 'stats': {
        const monitor = new DarkWebMonitorEngine(address || '0x0000000000000000000000000000000000000000')
        await monitor.scan()
        const risk = monitor.getRiskAssessment()
        const findings = monitor.getFindings()
        return NextResponse.json({ risk, findings, findingsCount: findings.length })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
