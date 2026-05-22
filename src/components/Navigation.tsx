'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavGroup {
  label: string
  icon: string
  items: { href: string; label: string; icon: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Security',
    icon: '🛡️',
    items: [
      { href: '/scan', label: 'Contract Scanner', icon: '🔍' },
      { href: '/audit-bot', label: 'Smart Contract Audit', icon: '🤖' },
      { href: '/scam-check', label: 'Scam Check', icon: '⚠️' },
      { href: '/reputation', label: 'Reputation', icon: '⭐' },
      { href: '/token-approvals', label: 'Token Approvals', icon: '📋' },
      { href: '/panic-button', label: 'Panic Button', icon: '🚨' },
      { href: '/honey-token', label: 'Honey Token', icon: '🍯' },
      { href: '/security-quests', label: 'Security Quests', icon: '🏆' },
    ],
  },
  {
    label: 'Monitoring',
    icon: '📡',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/ai-threat-intelligence', label: 'AI Threat Intel', icon: '🧠' },
      { href: '/wallet-health', label: 'Wallet Health Score', icon: '❤️' },
      { href: '/whale-alerts', label: 'Whale Alerts', icon: '🐋' },
      { href: '/live-drainer-map', label: 'Live Drainer Map', icon: '🗺️' },
      { href: '/dark-web-monitoring', label: 'Dark Web Monitor', icon: '🕵️' },
      { href: '/tracker', label: 'Fund Tracker', icon: '📍' },
    ],
  },
  {
    label: 'Recovery',
    icon: '🆘',
    items: [
      { href: '/recover', label: 'Recover Funds', icon: '💰' },
      { href: '/freeze', label: 'Freeze Request', icon: '🧊' },
      { href: '/multi-sig-recovery', label: 'Multi-Sig Recovery', icon: '🏛️' },
      { href: '/insurance', label: 'Insurance', icon: '🛡️' },
      { href: '/nft', label: 'NFT Rescue', icon: '🖼️' },
    ],
  },
  {
    label: 'Advanced',
    icon: '⚡',
    items: [
      { href: '/cross-chain-linking', label: 'Cross-Chain Linking', icon: '⛓️' },
      { href: '/family-protection', label: 'Family Protection', icon: '👨‍👩‍👧‍👦' },
      { href: '/browser-extension', label: 'Browser Extension', icon: '🧩' },
      { href: '/analytics', label: 'Analytics', icon: '📈' },
      { href: '/defi', label: 'DeFi Integration', icon: '🏦' },
      { href: '/bridge', label: 'Bridge', icon: '🌉' },
      { href: '/gas', label: 'Gas Tracker', icon: '⛽' },
    ],
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/[0.05] border border-white/[0.08] rounded-xl backdrop-blur-sm"
        aria-label="Toggle navigation"
      >
        <span className="text-lg">{mobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <nav className={`fixed top-0 left-0 h-full w-64 bg-[#0c0c14]/95 backdrop-blur-xl border-r border-white/[0.05] z-40 transition-transform duration-300 overflow-y-auto ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5">
          <Link href="/" className="flex items-center gap-2 mb-8" onClick={() => setMobileOpen(false)}>
            <span className="text-2xl">🛡️</span>
            <span className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">SweepGuard</span>
          </Link>

          <div className="space-y-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 text-white/30 text-[11px] uppercase tracking-wider hover:text-white/50 transition-colors"
                >
                  <span className="flex items-center gap-2">{group.icon} {group.label}</span>
                  <span className="text-[10px]">{expandedGroup === group.label || (expandedGroup === null && group.items.some(i => pathname === i.href)) ? '▼' : '▶'}</span>
                </button>
                {(expandedGroup === group.label || (expandedGroup === null && group.items.some(i => pathname === i.href))) && (
                  <div className="space-y-0.5 mb-2">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-white/[0.08] text-white font-medium'
                              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}
