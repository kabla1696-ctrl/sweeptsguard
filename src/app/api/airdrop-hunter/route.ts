import { NextRequest, NextResponse } from 'next/server'
import { getAllAirdrops, checkEligibility, getClaimGuide, getPastAirdrops, getNotifications, getAirdropsByStatus, getAirdropsByCategory } from '@/lib/airdropHunter'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const action = request.nextUrl.searchParams.get('action') || 'list'
  const address = request.nextUrl.searchParams.get('address')
  const airdropId = request.nextUrl.searchParams.get('id')
  const status = request.nextUrl.searchParams.get('status')
  const category = request.nextUrl.searchParams.get('category')

  try {
    switch (action) {
      case 'list': {
        let airdrops = getAllAirdrops()
        if (status) airdrops = getAirdropsByStatus(status as 'active' | 'upcoming' | 'claimed' | 'expired')
        if (category) airdrops = getAirdropsByCategory(category as 'defi' | 'nft' | 'gaming' | 'infrastructure' | 'layer2' | 'social')
        return NextResponse.json({ airdrops, total: airdrops.length })
      }
      case 'check': {
        if (!address || !airdropId) return NextResponse.json({ error: 'Address and airdrop ID required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const eligibility = checkEligibility(address, airdropId)
        return NextResponse.json(eligibility)
      }
      case 'guide': {
        if (!airdropId) return NextResponse.json({ error: 'Airdrop ID required' }, { status: 400 })
        const guide = getClaimGuide(airdropId)
        if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
        return NextResponse.json(guide)
      }
      case 'past': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        if (!isValidAddress(address)) return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
        const past = getPastAirdrops(address)
        return NextResponse.json({ past })
      }
      case 'notifications':
        return NextResponse.json({ notifications: getNotifications() })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
