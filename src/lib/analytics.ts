/**
 * In-memory analytics tracker for SweepGuard.
 * Data resets on cold start — acceptable for demo/small scale.
 * Privacy-friendly: IPs are hashed for unique counting.
 */

import { createHash } from 'crypto'

// ── Types ───────────────────────────────────────────────────────────────────

export interface Visit {
  path: string
  ipHash: string
  country: string
  userAgent: string
  timestamp: number
}

export interface AnalyticsOverview {
  totalVisitors: number
  totalPageViews: number
  activeVisitors: number
  topPages: { path: string; views: number }[]
  topCountries: { country: string; visitors: number }[]
  visitorsByHour: { hour: string; count: number }[]
  visitorsByDay: { date: string; count: number }[]
}

export interface RealtimeData {
  onlineNow: number
  recentVisits: { path: string; country: string; timestamp: number }[]
  currentPageViews: { path: string; count: number }[]
}

export interface CountryData {
  countries: { country: string; totalVisits: number; uniqueVisitors: number; topPages: string[] }[]
  worldMap: Record<string, number>
}

// ── In-memory store ─────────────────────────────────────────────────────────

const visits: Visit[] = []
const MAX_VISITS = 100_000 // cap memory usage

// ── Helpers ─────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + 'sweeptsguard-analytics').digest('hex').slice(0, 16)
}

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfHour(date: Date): number {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

/** Convert 2-letter ISO code to flag emoji */
export function countryToFlag(code: string): string {
  if (!code || code === 'unknown' || code.length !== 2) return '🌍'
  const codePoints = code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/** Time-ago string */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Track ───────────────────────────────────────────────────────────────────

export function trackVisit(path: string, ip: string, country: string, userAgent: string): void {
  // Trim old data if we hit the cap
  if (visits.length >= MAX_VISITS) {
    visits.splice(0, visits.length - MAX_VISITS + 1000)
  }

  visits.push({
    path,
    ipHash: hashIp(ip),
    country: country || 'unknown',
    userAgent,
    timestamp: Date.now(),
  })
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function getUniqueVisitors(since: number): number {
  const seen = new Set<string>()
  for (const v of visits) {
    if (v.timestamp >= since) seen.add(v.ipHash)
  }
  return seen.size
}

export function getPageViews(since: number): number {
  let count = 0
  for (const v of visits) {
    if (v.timestamp >= since) count++
  }
  return count
}

export function getOverview(): AnalyticsOverview {
  const now = Date.now()
  const todayStart = startOfDay(new Date())
  const thirtyMinAgo = now - 30 * 60 * 1000

  // Today's visitors
  const todayVisitors = new Set<string>()
  let todayPageViews = 0
  const pageCount: Record<string, number> = {}
  const countryVisitors: Record<string, Set<string>> = {}

  // Last 24h by hour
  const hourlyBuckets: Record<number, number> = {}
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

  // Last 30 days
  const dailyBuckets: Record<string, number> = {}
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  // Active (30 min)
  let activeVisitors = 0
  const activeIps = new Set<string>()

  for (const v of visits) {
    // Today stats
    if (v.timestamp >= todayStart) {
      todayVisitors.add(v.ipHash)
      todayPageViews++
    }

    // Page counts (all time for ranking, but we'll use today for top pages)
    if (v.timestamp >= todayStart) {
      pageCount[v.path] = (pageCount[v.path] || 0) + 1
    }

    // Country
    if (v.timestamp >= todayStart) {
      if (!countryVisitors[v.country]) countryVisitors[v.country] = new Set()
      countryVisitors[v.country].add(v.ipHash)
    }

    // Active 30 min
    if (v.timestamp >= thirtyMinAgo) {
      activeIps.add(v.ipHash)
    }

    // Hourly
    if (v.timestamp >= twentyFourHoursAgo) {
      const hourKey = startOfHour(new Date(v.timestamp))
      hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] || 0) + 1
    }

    // Daily
    if (v.timestamp >= thirtyDaysAgo) {
      const dayKey = new Date(v.timestamp).toISOString().slice(0, 10)
      dailyBuckets[dayKey] = (dailyBuckets[dayKey] || 0) + 1
    }
  }

  activeVisitors = activeIps.size

  // Top pages
  const topPages = Object.entries(pageCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }))

  // Top countries
  const topCountries = Object.entries(countryVisitors)
    .map(([country, ips]) => ({ country, visitors: ips.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10)

  // Hourly series — fill gaps
  const visitorsByHour: { hour: string; count: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now - i * 60 * 60 * 1000)
    const key = startOfHour(h)
    visitorsByHour.push({
      hour: h.toISOString().slice(11, 16), // HH:MM
      count: hourlyBuckets[key] || 0,
    })
  }

  // Daily series — fill gaps
  const visitorsByDay: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    visitorsByDay.push({
      date: key,
      count: dailyBuckets[key] || 0,
    })
  }

  return {
    totalVisitors: todayVisitors.size,
    totalPageViews: todayPageViews,
    activeVisitors,
    topPages,
    topCountries,
    visitorsByHour,
    visitorsByDay,
  }
}

export function getRealtime(): RealtimeData {
  const now = Date.now()
  const fiveMinAgo = now - 5 * 60 * 1000

  const recentVisits: { path: string; country: string; timestamp: number }[] = []
  const currentPageCount: Record<string, number> = {}

  for (const v of visits) {
    if (v.timestamp >= fiveMinAgo) {
      recentVisits.push({ path: v.path, country: v.country, timestamp: v.timestamp })
      currentPageCount[v.path] = (currentPageCount[v.path] || 0) + 1
    }
  }

  recentVisits.sort((a, b) => b.timestamp - a.timestamp)

  const currentPageViews = Object.entries(currentPageCount)
    .sort(([, a], [, b]) => b - a)
    .map(([path, count]) => ({ path, count }))

  return {
    onlineNow: new Set(recentVisits.map(v => visits.find(vv => vv.timestamp === v.timestamp)?.ipHash)).size,
    recentVisits: recentVisits.slice(0, 20),
    currentPageViews,
  }
}

export function getCountries(): CountryData {
  const countryStats: Record<string, { totalVisits: number; ips: Set<string>; pages: Record<string, number> }> = {}

  for (const v of visits) {
    const c = v.country || 'unknown'
    if (!countryStats[c]) {
      countryStats[c] = { totalVisits: 0, ips: new Set(), pages: {} }
    }
    countryStats[c].totalVisits++
    countryStats[c].ips.add(v.ipHash)
    countryStats[c].pages[v.path] = (countryStats[c].pages[v.path] || 0) + 1
  }

  const totalAllVisits = visits.length || 1

  const countries = Object.entries(countryStats)
    .map(([country, stats]) => ({
      country,
      totalVisits: stats.totalVisits,
      uniqueVisitors: stats.ips.size,
      topPages: Object.entries(stats.pages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([p]) => p),
    }))
    .sort((a, b) => b.totalVisits - a.totalVisits)

  const worldMap: Record<string, number> = {}
  for (const c of countries) {
    worldMap[c.country] = Math.round((c.totalVisits / totalAllVisits) * 10000) / 100 // percentage with 2 decimals
  }

  return { countries, worldMap }
}

export function getVisitorsByPeriod(period: 'hour' | 'day' | 'week'): { label: string; count: number }[] {
  const now = Date.now()
  let buckets: Record<string, number> = {}
  let labels: string[] = []

  if (period === 'hour') {
    // Last 60 minutes in 1-min buckets
    for (let i = 59; i >= 0; i--) {
      const t = new Date(now - i * 60_000)
      const key = t.toISOString().slice(11, 16)
      labels.push(key)
      buckets[key] = 0
    }
    for (const v of visits) {
      if (v.timestamp >= now - 60 * 60_000) {
        const key = new Date(v.timestamp).toISOString().slice(11, 16)
        buckets[key] = (buckets[key] || 0) + 1
      }
    }
  } else if (period === 'day') {
    // Last 24 hours in 1-hour buckets
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now - i * 3600_000)
      const key = t.toISOString().slice(11, 16)
      labels.push(key)
      buckets[key] = 0
    }
    for (const v of visits) {
      if (v.timestamp >= now - 24 * 3600_000) {
        const key = new Date(startOfHour(new Date(v.timestamp))).toISOString().slice(11, 16)
        buckets[key] = (buckets[key] || 0) + 1
      }
    }
  } else {
    // Last 7 days in day buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400_000)
      const key = d.toISOString().slice(0, 10)
      labels.push(key)
      buckets[key] = 0
    }
    for (const v of visits) {
      if (v.timestamp >= now - 7 * 86400_000) {
        const key = new Date(v.timestamp).toISOString().slice(0, 10)
        buckets[key] = (buckets[key] || 0) + 1
      }
    }
  }

  return labels.map(label => ({ label, count: buckets[label] || 0 }))
}
