import { NextRequest, NextResponse } from 'next/server'
import { scanner } from '@/lib/scanner'
import { DEFAULT_CHAINS } from '@/lib/chains'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 })
  }

  try {
    const result = await scanner.scanWallet(address, DEFAULT_CHAINS)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
