// Tax Report Generator — Capital gains/loss calculation from transaction history
// Supports FIFO/LIFO/HIFO cost basis methods, multiple country formats, PDF/CSV export

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'HIFO'
export type TaxCountry = 'US' | 'UK' | 'EU' | 'CA' | 'AU' | 'JP' | 'SG' | 'DE'
export type TransactionType = 'buy' | 'sell' | 'swap' | 'receive' | 'send' | 'airdrop' | 'mining' | 'staking' | 'gift_sent' | 'gift_received' | 'fee'

export interface TaxTransaction {
  id: string
  hash: string
  chainId: number
  chainName: string
  timestamp: number
  type: TransactionType
  asset: string
  amount: number
  priceAtTime: number // USD price at time of transaction
  valueUSD: number
  fee: number
  feeUSD: number
  from: string
  to: string
  counterparty?: string
  notes?: string
}

export interface CostBasisLot {
  asset: string
  amount: number
  costBasisPerUnit: number
  totalCostBasis: number
  acquiredAt: number
  txId: string
}

export interface CapitalGain {
  id: string
  asset: string
  amount: number
  salePrice: number
  costBasis: number
  gain: number
  isLongTerm: boolean // > 1 year
  acquiredAt: number
  disposedAt: number
  saleTxId: string
  lotTxId: string
}

export interface TaxSummary {
  taxYear: number
  country: TaxCountry
  costBasisMethod: CostBasisMethod
  totalGains: number
  totalLosses: number
  netGainLoss: number
  shortTermGains: number
  shortTermLosses: number
  longTermGains: number
  longTermLosses: number
  totalIncome: number // from airdrops, mining, staking
  totalFees: number
  totalTransactions: number
  assetBreakdown: AssetBreakdown[]
  monthlyBreakdown: MonthlyBreakdown[]
  gains: CapitalGain[]
  income: TaxTransaction[]
}

export interface AssetBreakdown {
  asset: string
  totalBought: number
  totalSold: number
  totalReceived: number
  totalSent: number
  realizedGain: number
  unrealizedGain: number
  avgCostBasis: number
  currentPrice: number
}

export interface MonthlyBreakdown {
  month: string
  gains: number
  losses: number
  income: number
  transactions: number
}

export interface CountryTaxInfo {
  country: TaxCountry
  name: string
  currency: string
  shortTermRate: string
  longTermRate: string
  incomeRate: string
  taxYearEnd: string
  reportingDeadline: string
  formName: string
  notes: string[]
}

// Country-specific tax information
const COUNTRY_TAX_INFO: Record<TaxCountry, CountryTaxInfo> = {
  US: {
    country: 'US',
    name: 'United States',
    currency: 'USD',
    shortTermRate: '10-37% (ordinary income)',
    longTermRate: '0%, 15%, or 20%',
    incomeRate: '10-37% (ordinary income)',
    taxYearEnd: 'December 31',
    reportingDeadline: 'April 15',
    formName: 'IRS Form 8949 + Schedule D',
    notes: [
      'Short-term gains (< 1 year) taxed as ordinary income',
      'Long-term gains (> 1 year) get preferential rates',
      'Airdrops and mining count as ordinary income at FMV when received',
      'Like-kind exchanges (Section 1031) do NOT apply to crypto after 2017',
      'Wash sale rules may apply (consult tax advisor)',
    ],
  },
  UK: {
    country: 'UK',
    name: 'United Kingdom',
    currency: 'GBP',
    shortTermRate: '10% or 20%',
    longTermRate: '10% or 20%',
    incomeRate: '20-45%',
    taxYearEnd: 'April 5',
    reportingDeadline: 'January 31',
    formName: 'Self Assessment — Capital Gains Summary',
    notes: [
      'CGT applies to all disposals (no distinction between short/long term)',
      'Annual CGT allowance: £3,000 (2024/25)',
      'Same-day and 30-day rule for matching disposals',
      'Airdrops may be subject to Income Tax',
      'HMRC uses pooling (Section 104) for cost basis',
    ],
  },
  EU: {
    country: 'EU',
    name: 'European Union',
    currency: 'EUR',
    shortTermRate: 'Varies by country',
    longTermRate: 'Varies by country',
    incomeRate: 'Varies by country',
    taxYearEnd: 'December 31',
    reportingDeadline: 'Varies by country',
    formName: 'Varies by country',
    notes: [
      'Tax treatment varies significantly by EU member state',
      'Germany: tax-free after 1 year holding (for individuals)',
      'France: flat 30% tax on crypto gains (PFU)',
      'Italy: 26% on gains above €2,000 threshold',
      'Consult local tax advisor for specific obligations',
    ],
  },
  CA: {
    country: 'CA',
    name: 'Canada',
    currency: 'CAD',
    shortTermRate: '50% of gain at marginal rate',
    longTermRate: '50% of gain at marginal rate',
    incomeRate: '100% at marginal rate',
    taxYearEnd: 'December 31',
    reportingDeadline: 'April 30',
    formName: 'Schedule 3 — Capital Gains',
    notes: [
      'Only 50% of capital gains are taxable (inclusion rate)',
      'No distinction between short and long-term gains',
      'Crypto treated as commodity, not currency',
      'Mining/staking income is 100% taxable',
      'Superficial loss rule (30 days) applies',
    ],
  },
  AU: {
    country: 'AU',
    name: 'Australia',
    currency: 'AUD',
    shortTermRate: 'Marginal rate (up to 45%)',
    longTermRate: '50% CGT discount',
    incomeRate: 'Marginal rate',
    taxYearEnd: 'June 30',
    reportingDeadline: 'October 31',
    formName: 'Capital Gains Tax Schedule',
    notes: [
      '50% CGT discount for assets held > 12 months',
      'No distinction between short and long-term in law (just discount)',
      'Personal use exemption for crypto < $10,000',
      'DeFi and staking rewards treated as income',
      'Record-keeping is critical for cost basis',
    ],
  },
  JP: {
    country: 'JP',
    name: 'Japan',
    currency: 'JPY',
    shortTermRate: '15-55% (miscellaneous income)',
    longTermRate: '15-55% (miscellaneous income)',
    incomeRate: '15-55%',
    taxYearEnd: 'December 31',
    reportingDeadline: 'March 15',
    formName: '確定申告 (Kakutei Shinkoku)',
    notes: [
      'All crypto gains classified as miscellaneous income (雑所得)',
      'No preferential long-term rate — all gains taxed the same',
      'Progressive rates up to 55% (including local tax)',
      'Crypto-to-crypto trades are taxable events',
      'Losses can offset other crypto gains only (not other income)',
    ],
  },
  SG: {
    country: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    shortTermRate: '0% (no CGT)',
    longTermRate: '0% (no CGT)',
    incomeRate: '0-22%',
    taxYearEnd: 'December 31',
    reportingDeadline: 'April 15',
    formName: 'Form B/B1',
    notes: [
      'No capital gains tax in Singapore',
      'Gains from disposal of crypto as investment are not taxable',
      'However, trading crypto as a business IS taxable as income',
      'GST applies to crypto transactions (being phased out)',
      'IRAS distinguishes personal investment vs trading activity',
    ],
  },
  DE: {
    country: 'DE',
    name: 'Germany',
    currency: 'EUR',
    shortTermRate: 'Up to 45% + solidarity surcharge',
    longTermRate: '0% (after 1 year)',
    incomeRate: 'Up to 45% + solidarity surcharge',
    taxYearEnd: 'December 31',
    reportingDeadline: 'July 31',
    formName: 'Anlage KAP / Anlage SO',
    notes: [
      'Tax-free after 1 year holding period for individuals',
      'Staking: 10-year holding period if staking rewards received',
      'Gains under €600/year are tax-free (Freigrenze)',
      'LIFO is accepted by the Finanzamt',
      'DeFi lending may extend holding period',
    ],
  },
}

/**
 * Calculate capital gains using specified cost basis method
 */
export function calculateCapitalGains(
  transactions: TaxTransaction[],
  method: CostBasisMethod,
  taxYear: number
): CapitalGain[] {
  // Filter to tax year and sort chronologically
  const yearTxs = transactions
    .filter(tx => {
      const year = new Date(tx.timestamp).getFullYear()
      return year === taxYear
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  // Build cost basis lots per asset
  const lots = new Map<string, CostBasisLot[]>()
  const gains: CapitalGain[] = []

  // First, build lots from all transactions (including before tax year for carry-over)
  const allSorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp)

  for (const tx of allSorted) {
    const isBuy = tx.type === 'buy' || tx.type === 'receive' || tx.type === 'airdrop' || tx.type === 'mining' || tx.type === 'staking'
    const isSell = tx.type === 'sell' || tx.type === 'send'

    if (isBuy) {
      const assetLots = lots.get(tx.asset) || []
      assetLots.push({
        asset: tx.asset,
        amount: tx.amount,
        costBasisPerUnit: tx.amount > 0 ? tx.valueUSD / tx.amount : 0,
        totalCostBasis: tx.valueUSD,
        acquiredAt: tx.timestamp,
        txId: tx.id,
      })
      lots.set(tx.asset, assetLots)
    }

    if (isSell) {
      const assetLots = lots.get(tx.asset) || []
      let remainingToSell = tx.amount
      const salePricePerUnit = tx.amount > 0 ? tx.valueUSD / tx.amount : 0

      // Select lots based on cost basis method
      const sortedLots = sortLotsByMethod([...assetLots], method)

      for (const lot of sortedLots) {
        if (remainingToSell <= 0) break
        if (lot.amount <= 0) continue

        const amountFromLot = Math.min(lot.amount, remainingToSell)
        const costBasis = amountFromLot * lot.costBasisPerUnit
        const saleValue = amountFromLot * salePricePerUnit
        const gain = saleValue - costBasis
        const holdingPeriod = tx.timestamp - lot.acquiredAt
        const isLongTerm = holdingPeriod > 365 * 24 * 60 * 60 * 1000

        // Only include gains from the tax year
        const saleYear = new Date(tx.timestamp).getFullYear()
        if (saleYear === taxYear) {
          gains.push({
            id: `gain-${tx.id}-${lot.txId}`,
            asset: tx.asset,
            amount: amountFromLot,
            salePrice: saleValue,
            costBasis,
            gain,
            isLongTerm,
            acquiredAt: lot.acquiredAt,
            disposedAt: tx.timestamp,
            saleTxId: tx.id,
            lotTxId: lot.txId,
          })
        }

        lot.amount -= amountFromLot
        remainingToSell -= amountFromLot
      }

      // Clean up depleted lots
      lots.set(tx.asset, assetLots.filter(l => l.amount > 0.00000001))
    }
  }

  return gains
}

/**
 * Sort lots based on cost basis method
 */
function sortLotsByMethod(lots: CostBasisLot[], method: CostBasisMethod): CostBasisLot[] {
  switch (method) {
    case 'FIFO': // First In, First Out
      return lots.sort((a, b) => a.acquiredAt - b.acquiredAt)
    case 'LIFO': // Last In, First Out
      return lots.sort((a, b) => b.acquiredAt - a.acquiredAt)
    case 'HIFO': // Highest In, First Out
      return lots.sort((a, b) => b.costBasisPerUnit - a.costBasisPerUnit)
  }
}

/**
 * Generate a full tax summary
 */
export function generateTaxSummary(
  transactions: TaxTransaction[],
  method: CostBasisMethod,
  taxYear: number,
  country: TaxCountry
): TaxSummary {
  const gains = calculateCapitalGains(transactions, method, taxYear)

  const yearTxs = transactions.filter(tx => new Date(tx.timestamp).getFullYear() === taxYear)

  // Calculate totals
  const shortTermGains = gains.filter(g => !g.isLongTerm && g.gain > 0).reduce((s, g) => s + g.gain, 0)
  const shortTermLosses = gains.filter(g => !g.isLongTerm && g.gain < 0).reduce((s, g) => s + Math.abs(g.gain), 0)
  const longTermGains = gains.filter(g => g.isLongTerm && g.gain > 0).reduce((s, g) => s + g.gain, 0)
  const longTermLosses = gains.filter(g => g.isLongTerm && g.gain < 0).reduce((s, g) => s + Math.abs(g.gain), 0)

  const totalGains = shortTermGains + longTermGains
  const totalLosses = shortTermLosses + longTermLosses
  const netGainLoss = totalGains - totalLosses

  // Income from airdrops, mining, staking
  const incomeTxs = yearTxs.filter(tx =>
    ['airdrop', 'mining', 'staking', 'gift_received'].includes(tx.type)
  )
  const totalIncome = incomeTxs.reduce((s, tx) => s + tx.valueUSD, 0)

  const totalFees = yearTxs.reduce((s, tx) => s + tx.feeUSD, 0)

  // Asset breakdown
  const assets = new Set(yearTxs.map(tx => tx.asset))
  const assetBreakdown: AssetBreakdown[] = Array.from(assets).map(asset => {
    const assetTxs = yearTxs.filter(tx => tx.asset === asset)
    const bought = assetTxs.filter(tx => ['buy', 'receive'].includes(tx.type))
    const sold = assetTxs.filter(tx => ['sell', 'send'].includes(tx.type))
    const received = assetTxs.filter(tx => ['airdrop', 'mining', 'staking', 'gift_received'].includes(tx.type))
    const sent = assetTxs.filter(tx => tx.type === 'gift_sent')

    const assetGains = gains.filter(g => g.asset === asset)
    const realizedGain = assetGains.reduce((s, g) => s + g.gain, 0)

    const totalBoughtAmt = bought.reduce((s, tx) => s + tx.amount, 0)
    const totalBoughtVal = bought.reduce((s, tx) => s + tx.valueUSD, 0)
    const totalSoldAmt = sold.reduce((s, tx) => s + tx.amount, 0)
    const totalReceivedAmt = received.reduce((s, tx) => s + tx.amount, 0)
    const totalSentAmt = sent.reduce((s, tx) => s + tx.amount, 0)

    const avgCostBasis = totalBoughtAmt > 0 ? totalBoughtVal / totalBoughtAmt : 0
    const lastPrice = assetTxs[assetTxs.length - 1]?.priceAtTime || 0

    return {
      asset,
      totalBought: totalBoughtAmt,
      totalSold: totalSoldAmt,
      totalReceived: totalReceivedAmt,
      totalSent: totalSentAmt,
      realizedGain,
      unrealizedGain: 0, // Would need current price
      avgCostBasis,
      currentPrice: lastPrice,
    }
  })

  // Monthly breakdown
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyBreakdown: MonthlyBreakdown[] = months.map((month, i) => {
    const monthTxs = yearTxs.filter(tx => new Date(tx.timestamp).getMonth() === i)
    const monthGains = gains.filter(g => new Date(g.disposedAt).getMonth() === i)
    const gainsTotal = monthGains.filter(g => g.gain > 0).reduce((s, g) => s + g.gain, 0)
    const lossesTotal = monthGains.filter(g => g.gain < 0).reduce((s, g) => s + Math.abs(g.gain), 0)
    const incomeTotal = monthTxs
      .filter(tx => ['airdrop', 'mining', 'staking'].includes(tx.type))
      .reduce((s, tx) => s + tx.valueUSD, 0)

    return {
      month,
      gains: gainsTotal,
      losses: lossesTotal,
      income: incomeTotal,
      transactions: monthTxs.length,
    }
  })

  return {
    taxYear,
    country,
    costBasisMethod: method,
    totalGains,
    totalLosses,
    netGainLoss,
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
    totalIncome,
    totalFees,
    totalTransactions: yearTxs.length,
    assetBreakdown,
    monthlyBreakdown,
    gains,
    income: incomeTxs,
  }
}

/**
 * Export tax report as CSV
 */
export function exportToCSV(summary: TaxSummary): string {
  const lines: string[] = []

  // Header info
  lines.push(`SweepGuard Tax Report`)
  lines.push(`Tax Year,${summary.taxYear}`)
  lines.push(`Country,${summary.country}`)
  lines.push(`Cost Basis Method,${summary.costBasisMethod}`)
  lines.push(`Generated,${new Date().toISOString()}`)
  lines.push('')

  // Summary
  lines.push('=== Summary ===')
  lines.push(`Total Gains,$${summary.totalGains.toFixed(2)}`)
  lines.push(`Total Losses,$${summary.totalLosses.toFixed(2)}`)
  lines.push(`Net Gain/Loss,$${summary.netGainLoss.toFixed(2)}`)
  lines.push(`Short-Term Gains,$${summary.shortTermGains.toFixed(2)}`)
  lines.push(`Short-Term Losses,$${summary.shortTermLosses.toFixed(2)}`)
  lines.push(`Long-Term Gains,$${summary.longTermGains.toFixed(2)}`)
  lines.push(`Long-Term Losses,$${summary.longTermLosses.toFixed(2)}`)
  lines.push(`Total Income,$${summary.totalIncome.toFixed(2)}`)
  lines.push('')

  // Capital gains detail
  lines.push('=== Capital Gains & Losses ===')
  lines.push('Asset,Amount,Sale Price,Cost Basis,Gain/Loss,Term,Acquired,Disposed')
  for (const g of summary.gains) {
    lines.push([
      g.asset,
      g.amount.toFixed(8),
      `$${g.salePrice.toFixed(2)}`,
      `$${g.costBasis.toFixed(2)}`,
      `$${g.gain.toFixed(2)}`,
      g.isLongTerm ? 'Long' : 'Short',
      new Date(g.acquiredAt).toLocaleDateString(),
      new Date(g.disposedAt).toLocaleDateString(),
    ].join(','))
  }
  lines.push('')

  // Income
  if (summary.income.length > 0) {
    lines.push('=== Income ===')
    lines.push('Type,Asset,Amount,Value USD,Date')
    for (const tx of summary.income) {
      lines.push([
        tx.type,
        tx.asset,
        tx.amount.toFixed(8),
        `$${tx.valueUSD.toFixed(2)}`,
        new Date(tx.timestamp).toLocaleDateString(),
      ].join(','))
    }
    lines.push('')
  }

  // Asset breakdown
  lines.push('=== Asset Breakdown ===')
  lines.push('Asset,Total Bought,Total Sold,Realized Gain,Avg Cost Basis')
  for (const a of summary.assetBreakdown) {
    lines.push([
      a.asset,
      a.totalBought.toFixed(8),
      a.totalSold.toFixed(8),
      `$${a.realizedGain.toFixed(2)}`,
      `$${a.avgCostBasis.toFixed(2)}`,
    ].join(','))
  }

  return lines.join('\n')
}

/**
 * Generate tax report text (for PDF-like output)
 */
export function generateReportText(summary: TaxSummary): string {
  const countryInfo = COUNTRY_TAX_INFO[summary.country]
  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════')
  lines.push('           SWEEPGUARD TAX REPORT')
  lines.push('═══════════════════════════════════════════════════')
  lines.push('')
  lines.push(`Tax Year: ${summary.taxYear}`)
  lines.push(`Country: ${countryInfo.name}`)
  lines.push(`Cost Basis Method: ${summary.costBasisMethod}`)
  lines.push(`Reporting Form: ${countryInfo.formName}`)
  lines.push(`Generated: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('───────────────────────────────────────────────────')
  lines.push('                    SUMMARY')
  lines.push('───────────────────────────────────────────────────')
  lines.push(`Total Capital Gains:      $${summary.totalGains.toFixed(2)}`)
  lines.push(`Total Capital Losses:     $${summary.totalLosses.toFixed(2)}`)
  lines.push(`Net Capital Gain/Loss:    $${summary.netGainLoss.toFixed(2)}`)
  lines.push('')
  lines.push(`Short-Term Gains:         $${summary.shortTermGains.toFixed(2)}`)
  lines.push(`Short-Term Losses:        $${summary.shortTermLosses.toFixed(2)}`)
  lines.push(`Long-Term Gains:          $${summary.longTermGains.toFixed(2)}`)
  lines.push(`Long-Term Losses:         $${summary.longTermLosses.toFixed(2)}`)
  lines.push('')
  lines.push(`Total Income:             $${summary.totalIncome.toFixed(2)}`)
  lines.push(`Total Fees Paid:          $${summary.totalFees.toFixed(2)}`)
  lines.push(`Total Transactions:       ${summary.totalTransactions}`)
  lines.push('')
  lines.push('───────────────────────────────────────────────────')
  lines.push('              CAPITAL GAINS DETAIL')
  lines.push('───────────────────────────────────────────────────')

  if (summary.gains.length === 0) {
    lines.push('No taxable events for this period.')
  } else {
    for (const g of summary.gains) {
      lines.push('')
      lines.push(`  ${g.asset} — ${g.amount.toFixed(6)} units`)
      lines.push(`    Sale Value:    $${g.salePrice.toFixed(2)}`)
      lines.push(`    Cost Basis:    $${g.costBasis.toFixed(2)}`)
      lines.push(`    Gain/Loss:     $${g.gain.toFixed(2)} ${g.gain >= 0 ? '📈' : '📉'}`)
      lines.push(`    Holding:       ${g.isLongTerm ? 'Long-Term (>1yr)' : 'Short-Term (<1yr)'}`)
      lines.push(`    Acquired:      ${new Date(g.acquiredAt).toLocaleDateString()}`)
      lines.push(`    Disposed:      ${new Date(g.disposedAt).toLocaleDateString()}`)
    }
  }

  lines.push('')
  lines.push('───────────────────────────────────────────────────')
  lines.push('              COUNTRY TAX INFO')
  lines.push('───────────────────────────────────────────────────')
  lines.push(`Short-Term Rate:  ${countryInfo.shortTermRate}`)
  lines.push(`Long-Term Rate:   ${countryInfo.longTermRate}`)
  lines.push(`Income Rate:      ${countryInfo.incomeRate}`)
  lines.push(`Tax Year End:     ${countryInfo.taxYearEnd}`)
  lines.push(`Filing Deadline:  ${countryInfo.reportingDeadline}`)
  lines.push('')
  lines.push('Notes:')
  for (const note of countryInfo.notes) {
    lines.push(`  • ${note}`)
  }
  lines.push('')
  lines.push('═══════════════════════════════════════════════════')
  lines.push('  This report is for informational purposes only.')
  lines.push('  Consult a qualified tax professional for filing.')
  lines.push('═══════════════════════════════════════════════════')

  return lines.join('\n')
}

/**
 * Get country tax info
 */
export function getCountryTaxInfo(country: TaxCountry): CountryTaxInfo {
  return COUNTRY_TAX_INFO[country]
}

/**
 * Get all supported countries
 */
export function getSupportedCountries(): CountryTaxInfo[] {
  return Object.values(COUNTRY_TAX_INFO)
}

/**
 * Generate demo transactions for testing
 */
export function generateDemoTransactions(count: number = 50): TaxTransaction[] {
  const assets = ['ETH', 'BTC', 'USDC', 'SOL', 'MATIC', 'ARB', 'OP', 'LINK', 'UNI', 'AAVE']
  const chains = [
    { id: 1, name: 'Ethereum' },
    { id: 8453, name: 'Base' },
    { id: 137, name: 'Polygon' },
    { id: 42161, name: 'Arbitrum' },
  ]
  const types: TransactionType[] = ['buy', 'sell', 'swap', 'receive', 'send', 'airdrop', 'staking']
  const transactions: TaxTransaction[] = []

  const basePrice: Record<string, number> = {
    ETH: 3500, BTC: 65000, USDC: 1, SOL: 150, MATIC: 0.8,
    ARB: 1.2, OP: 2.5, LINK: 15, UNI: 8, AAVE: 100,
  }

  for (let i = 0; i < count; i++) {
    const asset = assets[Math.floor(Math.random() * assets.length)]
    const chain = chains[Math.floor(Math.random() * chains.length)]
    const type = types[Math.floor(Math.random() * types.length)]
    const daysAgo = Math.floor(Math.random() * 365)
    const timestamp = Date.now() - daysAgo * 86400000

    // Random price variation ±30%
    const priceVariation = 0.7 + Math.random() * 0.6
    const priceAtTime = (basePrice[asset] || 100) * priceVariation
    const amount = type === 'airdrop' ? Math.random() * 1000 : Math.random() * 5
    const valueUSD = amount * priceAtTime

    transactions.push({
      id: `demo-tx-${i}`,
      hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      chainId: chain.id,
      chainName: chain.name,
      timestamp,
      type,
      asset,
      amount,
      priceAtTime,
      valueUSD,
      fee: 0.001 + Math.random() * 0.01,
      feeUSD: (0.001 + Math.random() * 0.01) * priceAtTime,
      from: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      to: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    })
  }

  return transactions.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Year-over-year comparison
 */
export function getYearOverYearComparison(
  transactions: TaxTransaction[],
  method: CostBasisMethod,
  years: number[] = [2023, 2024, 2025]
): { year: number; gains: number; losses: number; net: number; income: number }[] {
  return years.map(year => {
    const gains = calculateCapitalGains(transactions, method, year)
    const yearTxs = transactions.filter(tx => new Date(tx.timestamp).getFullYear() === year)

    const totalGains = gains.filter(g => g.gain > 0).reduce((s, g) => s + g.gain, 0)
    const totalLosses = gains.filter(g => g.gain < 0).reduce((s, g) => s + Math.abs(g.gain), 0)
    const income = yearTxs
      .filter(tx => ['airdrop', 'mining', 'staking'].includes(tx.type))
      .reduce((s, tx) => s + tx.valueUSD, 0)

    return {
      year,
      gains: totalGains,
      losses: totalLosses,
      net: totalGains - totalLosses,
      income,
    }
  })
}
