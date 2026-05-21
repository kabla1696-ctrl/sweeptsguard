import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CHAINS } from '@/lib/chains'
import { isValidAddress } from '@/lib/validation'

interface DeFiPosition {
  protocol: string
  type: 'lending' | 'lp' | 'staking' | 'yield'
  chainId: number
  chainName: string
  asset: string
  balance: string
  valueUsd?: number
  contractAddress: string
}

// Common DeFi protocol addresses
const DEFI_PROTOCOLS: Record<number, { name: string; type: DeFiPosition['type']; addresses: string[] }[]> = {
  1: [
    { name: 'Aave V3', type: 'lending', addresses: ['0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'] },
    { name: 'Compound V3', type: 'lending', addresses: ['0xc3d688B66703497DAA19211EEdff47f25384cdc3'] },
    { name: 'Uniswap V3', type: 'lp', addresses: ['0xE592427A0AEce92De3Edee1F18E0157C05861564'] },
  ],
  8453: [
    { name: 'Aave V3 Base', type: 'lending', addresses: ['0xA238Dd80C259a72e81d7e4664a9801593F98d1c5'] },
  ],
  42161: [
    { name: 'Aave V3 Arbitrum', type: 'lending', addresses: ['0x794a61358D6845594F94dc1DB02A252b5b4814aD'] },
  ],
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 })
  }

  if (!isValidAddress(address)) {
    return NextResponse.json({ error: 'Invalid address format. Must be 0x followed by 40 hex characters.' }, { status: 400 })
  }

  try {
    const positions: DeFiPosition[] = []

    for (const [chainIdStr, protocols] of Object.entries(DEFI_PROTOCOLS)) {
      const chainId = parseInt(chainIdStr, 10)
      const chain = CHAINS[chainId]
      if (!chain) continue

      const provider = new ethers.JsonRpcProvider(chain.rpc)

      for (const protocol of protocols) {
        for (const contractAddr of protocol.addresses) {
          try {
            // Check if user has a position by querying common view functions
            const contract = new ethers.Contract(contractAddr, [
              'function getUserAccountData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
              'function balanceOf(address) view returns (uint256)',
              'function getBalance(address) view returns (uint256)',
            ], provider)

            try {
              const accountData = await contract.getUserAccountData(address)
              const totalBorrow = accountData[4] as bigint
              const totalCollateral = accountData[0] as bigint

              if (totalCollateral > BigInt(0) || totalBorrow > BigInt(0)) {
                positions.push({
                  protocol: protocol.name,
                  type: protocol.type,
                  chainId,
                  chainName: chain.name,
                  asset: 'Multiple',
                  balance: ethers.formatEther(totalCollateral),
                  contractAddress: contractAddr
                })
              }
            } catch {
              // Protocol doesn't support this call pattern, skip
            }
          } catch {
            // Skip failed protocol checks
          }
        }
      }
    }

    return NextResponse.json({
      address,
      positions,
      totalPositions: positions.length,
      note: positions.length === 0 ? 'No DeFi positions found. This only checks major protocols on mainnet.' : undefined
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch DeFi positions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
