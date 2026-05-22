import { NextRequest, NextResponse } from 'next/server'
import { isValidAddress, sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'

interface StoredWallet {
  address: string
  label: string
  chainId: number
  balance?: string
  lastChecked?: string
}

// In-memory store (would use database in production)
const wallets = new Map<string, StoredWallet[]>()

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const owner = request.nextUrl.searchParams.get('owner')
  const address = request.nextUrl.searchParams.get('address')
  const chainId = parseInt(request.nextUrl.searchParams.get('chainId') || '1', 10)

  try {
    if (address && isValidAddress(address)) {
      // Get balance for specific address
      const chain = CHAINS[chainId]
      if (!chain) return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
      const provider = new ethers.JsonRpcProvider(chain.rpc)
      const balance = await provider.getBalance(address)
      return NextResponse.json({
        address,
        chainId,
        balance: ethers.formatEther(balance),
        chain: chain.name
      })
    }

    if (owner) {
      const userWallets = wallets.get(owner.toLowerCase()) || []
      return NextResponse.json({ wallets: userWallets })
    }

    return NextResponse.json({ error: 'Owner or address param required' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rl = rateLimit(ip, 20, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { action, owner, address, label, chainId } = body

    if (!owner) return NextResponse.json({ error: 'Owner required' }, { status: 400 })
    const key = owner.toLowerCase()

    switch (action) {
      case 'add': {
        if (!address || !isValidAddress(address)) return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
        const existing = wallets.get(key) || []
        if (existing.some(w => w.address.toLowerCase() === address.toLowerCase())) {
          return NextResponse.json({ error: 'Wallet already added' }, { status: 409 })
        }
        const wallet: StoredWallet = { address, label: label || 'Wallet', chainId: chainId || 1 }
        existing.push(wallet)
        wallets.set(key, existing)
        return NextResponse.json(wallet, { status: 201 })
      }
      case 'remove': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        const existing = wallets.get(key) || []
        wallets.set(key, existing.filter(w => w.address.toLowerCase() !== address.toLowerCase()))
        return NextResponse.json({ success: true })
      }
      case 'update': {
        if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 })
        const existing = wallets.get(key) || []
        const idx = existing.findIndex(w => w.address.toLowerCase() === address.toLowerCase())
        if (idx === -1) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        if (label) existing[idx].label = label
        if (chainId) existing[idx].chainId = chainId
        wallets.set(key, existing)
        return NextResponse.json(existing[idx])
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: sanitizeErrorMessage(err) }, { status: 500 })
  }
}
