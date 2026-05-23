import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// ── ERC-20 ABI (minimal) ──────────────────────────────────────────────
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
]

// ── RPC URLs ──────────────────────────────────────────────────────────
const RPC_URLS: Record<number, string> = {
  1: 'https://eth.drpc.org',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-bor-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  81457: 'https://rpc.blast.io',
  7777777: 'https://rpc.zora.energy',
  5000: 'https://rpc.mantle.xyz',
  34443: 'https://mainnet.mode.network',
  534352: 'https://rpc.scroll.io',
  80094: 'https://rpc.berachain.com',
  1329: 'https://evm-rpc.sei-apis.com',
  57073: 'https://rpc-gel.inkonchain.com',
}

// ── Private sequencer chains (no public mempool — safe from frontrun) ─
const PRIVATE_SEQUENCER = new Set([
  8453, 42161, 10, 324, 59144, 534352, 5000, 34443, 81457, 7777777,
  57073, 1868, 1923, 80094, 1329,
])

// ── Rate limiting ─────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_REQ = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= MAX_REQ) return false
  entry.count++
  return true
}

// ── Validate private key ──────────────────────────────────────────────
function isValidPrivateKey(key: string): boolean {
  try {
    new ethers.Wallet(key)
    return true
  } catch {
    return false
  }
}

// ── Safety checks before executing rescue ─────────────────────────────
async function preflightChecks(
  provider: ethers.JsonRpcProvider,
  compromisedAddress: string,
  sponsorAddress: string,
  tokenAddress: string,
  safeRecipient: string
): Promise<{ ok: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check 1: Compromised wallet must have token balance
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
  const [tokenBalance, tokenSymbol, tokenDecimals] = await Promise.all([
    tokenContract.balanceOf(compromisedAddress).catch(() => 0n),
    tokenContract.symbol().catch(() => 'UNKNOWN'),
    tokenContract.decimals().catch(() => 18),
  ])

  if (tokenBalance === 0n) {
    errors.push(`No ${tokenSymbol} tokens to rescue — balance is 0`)
  }

  // Check 2: Sponsor wallet must have gas
  const sponsorBalance = await provider.getBalance(sponsorAddress)
  const minGas = ethers.parseEther('0.001') // minimum 0.001 ETH for gas
  if (sponsorBalance < minGas) {
    errors.push(`Sponsor wallet needs gas. Has ${ethers.formatEther(sponsorBalance)} ETH, need at least 0.001 ETH`)
  }

  // Check 3: Safe recipient must be a valid address (not zero)
  if (safeRecipient === ethers.ZeroAddress) {
    errors.push('Safe recipient cannot be zero address')
  }

  // Check 4: Safe recipient should not be the compromised wallet
  if (safeRecipient.toLowerCase() === compromisedAddress.toLowerCase()) {
    errors.push('Safe recipient cannot be the compromised wallet itself')
  }

  // Check 5: Check if contract code exists at token address
  const code = await provider.getCode(tokenAddress)
  if (!code || code === '0x') {
    errors.push('No contract at token address — invalid token')
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

// ── POST /api/extension/rescue-tokens ─────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in 1 minute.' }, { status: 429 })
    }

    const body = await request.json()
    const { privateKey, sponsorPrivateKey, tokenAddress, safeRecipient, chainId } = body

    // ── Input validation ──────────────────────────────────────────────
    if (!privateKey || !sponsorPrivateKey || !tokenAddress || !safeRecipient || !chainId) {
      return NextResponse.json({
        error: 'Missing required fields: privateKey, sponsorPrivateKey, tokenAddress, safeRecipient, chainId'
      }, { status: 400 })
    }

    if (!isValidPrivateKey(privateKey)) {
      return NextResponse.json({ error: 'Invalid compromised wallet private key' }, { status: 400 })
    }
    if (!isValidPrivateKey(sponsorPrivateKey)) {
      return NextResponse.json({ error: 'Invalid sponsor wallet private key' }, { status: 400 })
    }

    if (!ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Invalid token address' }, { status: 400 })
    }
    if (!ethers.isAddress(safeRecipient)) {
      return NextResponse.json({ error: 'Invalid safe recipient address' }, { status: 400 })
    }

    const rpcUrl = RPC_URLS[chainId]
    if (!rpcUrl) {
      return NextResponse.json({ error: `Chain ${chainId} not supported` }, { status: 400 })
    }

    // ── Setup wallets ─────────────────────────────────────────────────
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const compromisedWallet = new ethers.Wallet(privateKey, provider)
    const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, provider)

    // ── Preflight safety checks ───────────────────────────────────────
    const checks = await preflightChecks(
      provider,
      compromisedWallet.address,
      sponsorWallet.address,
      tokenAddress,
      safeRecipient
    )

    if (!checks.ok) {
      return NextResponse.json({
        error: 'Preflight checks failed',
        details: checks.errors,
        warnings: checks.warnings,
      }, { status: 400 })
    }

    // ── Get token info ────────────────────────────────────────────────
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const [balance, symbol, decimals] = await Promise.all([
      tokenContract.balanceOf(compromisedWallet.address),
      tokenContract.symbol().catch(() => 'UNKNOWN'),
      tokenContract.decimals().catch(() => 18),
    ])

    // ── Check allowance — compromised wallet must approve our contract or transfer directly
    // Direct transfer is safer (no approval needed)
    const tokenWithSigner = tokenContract.connect(compromisedWallet) as ethers.Contract & {
      transfer: (to: string, amount: bigint) => Promise<ethers.TransactionResponse>
    }

    // ── Get gas price ─────────────────────────────────────────────────
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('20', 'gwei')
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')

    // ── Build transfer TX ─────────────────────────────────────────────
    // Transfer all tokens from compromised wallet to safe recipient
    const transferTx = await tokenWithSigner.transfer(safeRecipient, balance)

    console.log(`[RescueTokens] TX submitted: ${transferTx.hash} | ${ethers.formatUnits(balance, decimals)} ${symbol}`)

    // Wait for confirmation
    const receipt = await transferTx.wait(1, 60000).catch(() => null)

    if (receipt && receipt.status === 1) {
      return NextResponse.json({
        success: true,
        txHash: transferTx.hash,
        blockNumber: receipt.blockNumber,
        tokenAddress,
        symbol,
        amount: ethers.formatUnits(balance, decimals),
        amountRaw: balance.toString(),
        decimals,
        from: compromisedWallet.address,
        to: safeRecipient,
        chainId,
        explorerUrl: `https://basescan.org/tx/${transferTx.hash}`,
      })
    }

    return NextResponse.json({
      error: 'Transaction failed or reverted',
      txHash: transferTx.hash,
    }, { status: 500 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[RescueTokens] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
