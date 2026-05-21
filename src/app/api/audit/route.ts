import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress } from '@/lib/validation'

interface AuditResult {
  address: string
  chainId: number
  isAudited: boolean
  auditors: string[]
  riskScore: number
  issues: string[]
  source: string
  reportUrl?: string
}

// Known audit databases (simplified - in production use GoPlus/SlowMist APIs)
const KNOWN_AUDITS: Record<string, { auditors: string[]; score: number; reportUrl?: string }> = {
  // Example entries
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const chainIdParam = request.nextUrl.searchParams.get('chainId')
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const normalized = address.toLowerCase()
    const knownAudit = KNOWN_AUDITS[normalized]

    if (knownAudit) {
      const result: AuditResult = {
        address,
        chainId,
        isAudited: true,
        auditors: knownAudit.auditors,
        riskScore: knownAudit.score,
        issues: [],
        source: 'Database',
        reportUrl: knownAudit.reportUrl
      }
      return NextResponse.json(result)
    }

    // Try GoPlus API for contract security check
    let goPlusResult: { is_audit?: string; audit_links?: string[] } | null = null
    try {
      const goPlusUrl = `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`
      const goPlusRes = await fetch(goPlusUrl, { signal: AbortSignal.timeout(5000) })
      const goPlusData = await goPlusRes.json() as { result?: Record<string, { is_audit?: string; audit_links?: string[] }> }
      goPlusResult = goPlusData.result?.[address.toLowerCase()] || null
    } catch {
      // GoPlus unavailable
    }

    const isAudited = goPlusResult?.is_audit === '1'
    const auditors = goPlusResult?.audit_links || []

    const result: AuditResult = {
      address,
      chainId,
      isAudited,
      auditors,
      riskScore: isAudited ? 70 : 30,
      issues: isAudited ? [] : ['Contract not audited by known auditor'],
      source: goPlusResult ? 'GoPlus' : 'Local',
      reportUrl: auditors[0]
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
