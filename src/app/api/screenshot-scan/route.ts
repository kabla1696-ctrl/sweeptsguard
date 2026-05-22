import { NextRequest, NextResponse } from 'next/server'
import { sanitizeErrorMessage } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(ip, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetTime - Date.now()) / 1000)) } }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Image file required (field name: "image")' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` },
      { status: 400 }
    )
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 })
  }

  try {
    const { analyzeScreenshot } = await import('@/lib/screenshotScan')

    // Convert file to buffer for analysis
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Run the real analysis engine
    const result = await analyzeScreenshot(new File([buffer], file.name, { type: file.type }))

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        summary: result.summary,
        threats: result.findings.map(f => ({
          type: f.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          detail: f.description,
          severity: f.severity,
          confidence: f.confidence,
          evidence: f.evidence,
        })),
        extractedEntities: result.extractedEntities.map(e => ({
          type: e.type,
          value: e.value,
          riskLevel: e.riskLevel,
        })),
        safeElements: result.findings.filter(f => f.severity === 'low').map(f => f.description),
        recommendation: result.riskLevel === 'critical' || result.riskLevel === 'high'
          ? `Do NOT interact with any links or addresses shown. ${result.summary}`
          : result.riskLevel === 'medium'
          ? 'Exercise caution. Verify any addresses or links through official channels.'
          : 'No significant threats detected. Always verify through official channels.',
        overallRisk: result.riskLevel,
        knownPhishingMatch: result.knownPhishingMatch,
        ocrTextLength: result.ocrText.length,
        timestamp: result.timestamp,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(err) || 'Screenshot analysis failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    maxFileSize: '10MB',
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
    description: 'Upload a screenshot to scan for crypto scams, phishing attempts, and suspicious patterns.',
  })
}
