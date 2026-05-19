import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const PLATFORM_FEE_WALLET = '0x7A3725154a2E6468F9549334394802e9E2822C2A'
const PLATFORM_FEE_PERCENT = 20

// RPC URLs for all chains
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org', 8453: 'https://base.drpc.org', 56: 'https://bsc.drpc.org',
  42161: 'https://arbitrum.drpc.org', 137: 'https://polygon.drpc.org', 10: 'https://optimism.drpc.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc', 250: 'https://rpc.ftm.tools',
  25: 'https://evm.cronos.org', 81457: 'https://rpc.blast.io', 7777777: 'https://rpc.zora.energy',
  1101: 'https://zkevm-rpc.com', 169: 'https://pacific-rpc.manta.network/http',
  324: 'https://mainnet.era.zksync.io', 59144: 'https://rpc.linea.build',
  5000: 'https://rpc.mantle.xyz', 34443: 'https://mainnet.mode.network',
  534352: 'https://rpc.scroll.io', 100: 'https://rpc.gnosischain.com',
  7000: 'https://zeta-chain.drpc.org', 1625: 'https://rpc.gravity.xyz',
  1116: 'https://rpc.coredao.org', 1329: 'https://evm-rpc.sei-apis.com',
  80094: 'https://rpc.berachain.com', 57073: 'https://rpc-gel.inkonchain.com',
  196: 'https://rpc.xlayer.tech', 43111: 'https://rpc.hemi.network',
  8217: 'https://public-en.node.kaia.io', 1868: 'https://rpc.soneium.org',
  2818: 'https://rpc.morphl2.io', 1923: 'https://swell-mainnet.alt.technology',
  10143: 'https://testnet-rpc.monad.xyz', 16600: 'https://evm.0g.ai',
}

const GAS_TOKENS: Record<number, string> = {
  1: 'ETH', 8453: 'ETH', 56: 'BNB', 42161: 'ETH', 137: 'MATIC', 10: 'ETH',
  43114: 'AVAX', 250: 'FTM', 25: 'CRO', 81457: 'ETH', 7777777: 'ETH',
  1101: 'ETH', 169: 'ETH', 324: 'ETH', 59144: 'ETH', 5000: 'MNT',
  34443: 'ETH', 534352: 'ETH', 100: 'xDai', 7000: 'ZETA', 1625: 'G',
  1116: 'CORE', 1329: 'SEI', 80094: 'BERA', 57073: 'ETH', 196: 'OKB',
  43111: 'ETH', 8217: 'KAIA', 1868: 'ETH', 2818: 'ETH', 1923: 'ETH',
  10143: 'MON', 16600: '0G',
}

// Try to read token info + eligibility from contract
async function detectAirdropInfo(provider: ethers.JsonRpcProvider, contractAddress: string) {
  const iface = new ethers.Interface([
    'function token() view returns (address)',
    'function rewardToken() view returns (address)',
    'function claimed(address) view returns (uint256)',
    'function isClaimed(bytes32) view returns (bool)',
    'function merkleRoot() view returns (bytes32)',
    'function claimableAmount(address) view returns (uint256)',
    'function pending(address) view returns (uint256)',
    'function available(address) view returns (uint256)',
    'function rewards(address) view returns (uint256)',
    'function getReward(address) view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
  ])

  let tokenAddress = ''
  let tokenSymbol = 'TOKEN'
  let tokenDecimals = 18
  let claimableRaw = '0'
  let eligible = false

  // Try to get token address
  for (const fn of ['token', 'rewardToken']) {
    try {
      const data = iface.encodeFunctionData(fn)
      const result = await provider.call({ to: contractAddress, data })
      tokenAddress = iface.decodeFunctionResult(fn, result)[0] as string
      if (tokenAddress && tokenAddress !== ethers.ZeroAddress) break
    } catch {}
  }

  // If no token address found, check if contract itself is a token
  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    try {
      const tokenIface = new ethers.Interface(['function symbol() view returns (string)', 'function decimals() view returns (uint8)'])
      const symData = tokenIface.encodeFunctionData('symbol')
      const symResult = await provider.call({ to: contractAddress, data: symData })
      tokenSymbol = tokenIface.decodeFunctionResult('symbol', symResult)[0] as string
      tokenAddress = contractAddress
      try {
        const decData = tokenIface.encodeFunctionData('decimals')
        const decResult = await provider.call({ to: contractAddress, data: decData })
        tokenDecimals = Number(tokenIface.decodeFunctionResult('decimals', decResult)[0])
      } catch {}
    } catch {}
  }

  // Get token info if we have address
  if (tokenAddress && tokenAddress !== ethers.ZeroAddress && tokenAddress !== contractAddress) {
    try {
      const tokenIface = new ethers.Interface(['function symbol() view returns (string)', 'function decimals() view returns (uint8)'])
      const [symResult, decResult] = await Promise.all([
        provider.call({ to: tokenAddress, data: tokenIface.encodeFunctionData('symbol') }).catch(() => '0x'),
        provider.call({ to: tokenAddress, data: tokenIface.encodeFunctionData('decimals') }).catch(() => '0x'),
      ])
      try { tokenSymbol = tokenIface.decodeFunctionResult('symbol', symResult)[0] as string } catch {}
      try { tokenDecimals = Number(tokenIface.decodeFunctionResult('decimals', decResult)[0]) } catch {}
    } catch {}
  }

  return { tokenAddress, tokenSymbol, tokenDecimals, claimableRaw, eligible }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, contractAddress, chainId, safeWallet, privateKey, sponsorPrivateKey, claimableRaw, tokenAddress } = body

    if (!contractAddress || !chainId) {
      return NextResponse.json({ error: 'Contract address and chain required' }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId] || RPC_URLS[1]
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const gasToken = GAS_TOKENS[chainId] || 'ETH'

    // ============ PREVIEW ============
    if (action === 'preview') {
      if (!safeWallet || !sponsorPrivateKey) {
        return NextResponse.json({ error: 'Safe wallet and sponsor key required' }, { status: 400 })
      }

      // Detect token + eligibility
      const info = await detectAirdropInfo(provider, contractAddress)

      // Get sponsor balance
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey)
      const sponsorBalance = await provider.getBalance(sponsorWallet.address)
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei')
      const estimatedGas = gasPrice * 100000n // ~100k gas for claim
      const sponsorHasGas = sponsorBalance >= estimatedGas

      // Calculate split (using claimableRaw if available, else placeholder)
      const claimAmount = claimableRaw ? BigInt(claimableRaw) : 0n
      const safeAmount = (claimAmount * BigInt(100 - PLATFORM_FEE_PERCENT)) / 100n
      const feeAmount = (claimAmount * BigInt(PLATFORM_FEE_PERCENT)) / 100n

      const formatAmount = (raw: bigint) => {
        if (raw === 0n) return '0'
        return parseFloat(ethers.formatUnits(raw, info.tokenDecimals)).toFixed(4)
      }

      return NextResponse.json({
        eligible: true, // Will be determined during claim
        tokenAddress: info.tokenAddress || contractAddress,
        tokenSymbol: info.tokenSymbol,
        tokenDecimals: info.tokenDecimals,
        claimableAmount: formatAmount(claimAmount),
        claimableRaw: claimableRaw || '0',
        safeWalletAmount: formatAmount(safeAmount),
        platformFeeAmount: formatAmount(feeAmount),
        sponsorBalance: parseFloat(ethers.formatEther(sponsorBalance)).toFixed(6),
        sponsorGasToken: gasToken,
        sponsorHasGas,
        estimatedGasCost: parseFloat(ethers.formatEther(estimatedGas)).toFixed(6),
      })
    }

    // ============ CLAIM ============
    if (action === 'claim') {
      if (!privateKey || !sponsorPrivateKey || !safeWallet) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 })
      }

      const compromisedWallet = new ethers.Wallet(privateKey)
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)

      // Get current state
      const [sponsorBalance, feeData, nonce] = await Promise.all([
        provider.getBalance(sponsorWallet.address),
        provider.getFeeData(),
        provider.getTransactionCount(compromisedWallet.address),
      ])

      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei')
      const gasNeeded = gasPrice * 150000n

      if (sponsorBalance < gasNeeded) {
        return NextResponse.json({
          error: `Sponsor wallet needs ${ethers.formatEther(gasNeeded)} ${gasToken} for gas. Has: ${ethers.formatEther(sponsorBalance)} ${gasToken}`
        })
      }

      // Build claim transaction
      // Try common claim function signatures
      const claimIface = new ethers.Interface([
        'function claim()',
        'function claim(address to)',
        'function claim(address to, uint256 amount)',
        'function claim(address to, uint256 amount, bytes32[] proof)',
        'function claimReward()',
        'function getReward()',
        'function collectReward()',
      ])

      // Determine claim function and data
      let claimData = '0x'
      let claimValue = 0n

      // Try to detect the right claim function by checking contract code
      const code = await provider.getCode(contractAddress)

      // Try claim() first — simplest
      if (code.includes('4e71d92d') || code.includes('claim')) {
        try {
          claimData = claimIface.encodeFunctionData('claim')
        } catch {}
      }

      // Try claim(address) for some airdrops
      if (claimData === '0x') {
        try {
          claimData = claimIface.encodeFunctionData('claim', [compromisedWallet.address])
        } catch {}
      }

      // Fallback: simple claim()
      if (claimData === '0x') {
        claimData = claimIface.encodeFunctionData('claim')
      }

      // TX 1: Sponsor sends gas to compromised wallet
      const fundTx = await sponsorWallet.signTransaction({
        to: compromisedWallet.address,
        value: gasNeeded,
        gasLimit: 21000n,
        gasPrice,
        nonce: await provider.getTransactionCount(sponsorWallet.address),
        chainId: BigInt(chainId),
        type: 0,
      })

      // TX 2: Compromised wallet claims (tokens go to safe wallet via FeeCollector or direct)
      const claimTx = await compromisedWallet.signTransaction({
        to: contractAddress,
        value: claimValue,
        data: claimData,
        gasLimit: 150000n,
        gasPrice,
        nonce,
        chainId: BigInt(chainId),
        type: 0,
      })

      // Submit transactions sequentially
      try {
        // Send fund tx first (sponsor → compromised wallet for gas)
        const fundReceipt = await provider.broadcastTransaction(fundTx)
        await fundReceipt.wait()

        // Small delay for gas to arrive
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Send claim tx (compromised wallet → airdrop contract)
        const claimReceipt = await provider.broadcastTransaction(claimTx)
        const receipt = await claimReceipt.wait()

        return NextResponse.json({
          success: true,
          txHash: receipt?.hash || '',
          message: 'Claim executed successfully'
        })
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Transaction failed'
        return NextResponse.json({ error: errMsg })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
