import { NextRequest, NextResponse } from 'next/server'
import { verifyContract, batchVerify, getVerificationHistory, getBatchJob } from '@/lib/contractVerifier'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

/**
 * POST /api/contract-verify
 * Verify a single contract or batch verify multiple contracts
 * Body (single): { address: string, chainId?: number }
 * Body (batch): { addresses: string[], chainId?: number }
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const { address, addresses, chainId = 1 } = body as {
      address?: string
      addresses?: string[]
      chainId?: number
    }

    // Validate chainId
    if (typeof chainId !== 'number' || chainId < 1) {
      return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 })
    }

    // Batch verification
    if (addresses && Array.isArray(addresses)) {
      const validAddresses = addresses
        .filter((a): a is string => typeof a === 'string')
        .map(a => a.trim())
        .filter(a => isValidAddress(a))

      if (validAddresses.length === 0) {
        return NextResponse.json(
          { error: 'No valid addresses provided' },
          { status: 400 }
        )
      }

      if (validAddresses.length > 50) {
        return NextResponse.json(
          { error: 'Maximum 50 addresses per batch' },
          { status: 400 }
        )
      }

      const job = await batchVerify(validAddresses, chainId)
      return NextResponse.json({ success: true, data: job })
    }

    // Single verification
    if (!address || !isValidAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid contract address. Must be a valid 0x address.' },
        { status: 400 }
      )
    }

    const result = await verifyContract(address.trim(), chainId)
    return NextResponse.json({ success: true, data: result })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/contract-verify' })
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Verification failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/contract-verify?limit=50
 * Get verification history
 * GET /api/contract-verify?jobId=xxx
 * Get batch job status
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const jobId = request.nextUrl.searchParams.get('jobId')
    if (jobId) {
      const job = getBatchJob(jobId)
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: job })
    }

    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Math.min(200, Math.max(1, parseInt(limitParam, 10) || 50)) : 50
    const history = getVerificationHistory(limit)
    return NextResponse.json({ success: true, data: history })
  } catch (err: unknown) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: '/api/contract-verify GET' })
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
