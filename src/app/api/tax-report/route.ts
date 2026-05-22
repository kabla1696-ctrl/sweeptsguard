import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import {
  generateTaxSummary,
  generateDemoTransactions,
  exportToCSV,
  generateReportText,
  getSupportedCountries,
  type CostBasisMethod,
  type TaxCountry,
  type TaxTransaction,
} from '@/lib/taxReport'

interface TaxReportRequest {
  action: 'generate' | 'export-csv' | 'export-text' | 'countries'
  address?: string
  year?: number
  country?: string
  costMethod?: string
  chainIds?: number[]
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  let body: TaxReportRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const year = body.year || new Date().getFullYear()
    const country = (body.country?.toUpperCase() || 'US') as TaxCountry
    const costMethod = (body.costMethod || 'FIFO') as CostBasisMethod

    if (body.action === 'generate') {
      // Generate transactions — in production, these would be fetched from on-chain data
      // using the tracker module with the user's address
      let transactions: TaxTransaction[]

      if (body.address) {
        // In a real deployment, we'd fetch actual TX history:
        // const { tracker } = await import('@/lib/tracker')
        // const transfers = await tracker.trackAllChains(body.address, body.chainIds || [1, 8453, 42161])
        // Then convert transfers to TaxTransaction format
        // For now, generate realistic demo data seeded by the address
        const seedHash = body.address.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
        transactions = generateDemoTransactions(40 + Math.abs(seedHash) % 30)
      } else {
        transactions = generateDemoTransactions(50)
      }

      // Generate the real tax summary using the lib
      const summary = generateTaxSummary(transactions, costMethod, year, country)

      return NextResponse.json({
        success: true,
        summary: {
          taxYear: summary.taxYear,
          country: summary.country,
          costBasisMethod: summary.costBasisMethod,
          totalGains: summary.totalGains,
          totalLosses: summary.totalLosses,
          netGainLoss: summary.netGainLoss,
          shortTermGains: summary.shortTermGains,
          shortTermLosses: summary.shortTermLosses,
          longTermGains: summary.longTermGains,
          longTermLosses: summary.longTermLosses,
          totalIncome: summary.totalIncome,
          totalFees: summary.totalFees,
          totalTransactions: summary.totalTransactions,
          assetBreakdown: summary.assetBreakdown,
          monthlyBreakdown: summary.monthlyBreakdown,
          gains: summary.gains.map(g => ({
            id: g.id,
            asset: g.asset,
            amount: g.amount,
            salePrice: g.salePrice,
            costBasis: g.costBasis,
            gain: g.gain,
            isLongTerm: g.isLongTerm,
            acquiredAt: g.acquiredAt,
            disposedAt: g.disposedAt,
          })),
          income: summary.income.map(tx => ({
            id: tx.id,
            type: tx.type,
            asset: tx.asset,
            amount: tx.amount,
            valueUSD: tx.valueUSD,
            timestamp: tx.timestamp,
          })),
        },
        transactions: transactions.map(tx => ({
          id: tx.id,
          date: new Date(tx.timestamp).toISOString().split('T')[0],
          type: tx.type,
          asset: tx.asset,
          amount: tx.amount,
          price: tx.priceAtTime,
          value: tx.valueUSD,
          costBasis: tx.type === 'buy' ? tx.valueUSD : 0,
          gain: tx.type === 'sell' ? tx.valueUSD - (tx.feeUSD || 0) : 0,
          chain: tx.chainName,
          hash: tx.hash,
        })),
      })
    }

    if (body.action === 'export-csv') {
      const transactions = generateDemoTransactions(50)
      const summary = generateTaxSummary(transactions, costMethod, year, country)
      const csv = exportToCSV(summary)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sweeptsguard-tax-report-${year}.csv"`,
        },
      })
    }

    if (body.action === 'export-text') {
      const transactions = generateDemoTransactions(50)
      const summary = generateTaxSummary(transactions, costMethod, year, country)
      const text = generateReportText(summary)

      return NextResponse.json({
        success: true,
        report: text,
        filename: `sweeptsguard-tax-report-${year}.txt`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Tax report generation failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    supportedCountries: getSupportedCountries(),
    supportedMethods: ['FIFO', 'LIFO', 'HIFO'],
    actions: ['generate', 'export-csv', 'export-text', 'countries'],
  })
}
