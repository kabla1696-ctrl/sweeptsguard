'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavGroup {
  label: string
  icon: string
  color: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Security',
    icon: '🛡️',
    color: '#00ff87',
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
    label: 'Monitor',
    icon: '📡',
    color: '#00e5ff',
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
    label: 'Recover',
    icon: '🆘',
    color: '#a855f7',
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
    color: '#00e5ff',
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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-expand group containing current path
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find(g => g.items.some(i => pathname === i.href))
    if (activeGroup) setExpandedGroup(activeGroup.label)
  }, [pathname])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(5,5,7,0.8)' : 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
        }}
        aria-label="Toggle navigation"
      >
        <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
          <span
            className="block w-4 h-[1.5px] bg-white/70 transition-all duration-300"
            style={{
              transform: mobileOpen ? 'translateY(3.5px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block w-4 h-[1.5px] bg-white/70 transition-all duration-300"
            style={{
              opacity: mobileOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-4 h-[1.5px] bg-white/70 transition-all duration-300"
            style={{
              transform: mobileOpen ? 'translateY(-3.5px) rotate(-45deg)' : 'none',
            }}
          />
        </div>
      </button>

      {/* Mobile overlay */}
      <div
        className="lg:hidden fixed inset-0 z-[45] transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <nav
        className="fixed top-0 left-0 h-full z-[50] transition-all duration-300 ease-out overflow-hidden"
        style={{
          width: '288px',
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Sidebar background with glass effect */}
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{
            background: 'rgba(5,5,7,0.85)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        />

        {/* Subtle gradient accent line */}
        <div
          className="absolute top-0 right-0 w-[1px] h-full"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,255,135,0.2), transparent 30%, rgba(0,229,255,0.1) 50%, transparent 70%, rgba(168,85,247,0.15))',
          }}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          <div className="p-6 pb-4">
            <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,135,0.15), rgba(0,229,255,0.1))',
                    border: '1px solid rgba(0,255,135,0.2)',
                    boxShadow: '0 0 20px rgba(0,255,135,0.1)',
                  }}
                >
                  🛡️
                </div>
                {/* Pulse ring */}
                <div
                  className="absolute inset-0 rounded-xl animate-pulse-glow"
                  style={{
                    border: '1px solid rgba(0,255,135,0.15)',
                  }}
                />
              </div>
              <div>
                <span className="text-lg font-bold text-gradient-green tracking-tight">
                  SweepGuard
                </span>
                <div className="text-[10px] text-white/20 font-medium tracking-wider uppercase">
                  Wallet Protection
                </div>
              </div>
            </Link>
          </div>

          {/* Quick links */}
          <div className="px-4 pb-3 flex gap-2">
            {[
              { href: '/solana', label: '◎ Solana', color: '#a855f7' },
              { href: '/recover', label: '💰 Recover', color: '#00ff87' },
            ].map((quick) => (
              <Link
                key={quick.href}
                href={quick.href}
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{
                  color: quick.color,
                  background: `${quick.color}10`,
                  border: `1px solid ${quick.color}20`,
                }}
              >
                {quick.label}
              </Link>
            ))}
          </div>

          <div className="px-4 mb-2">
            <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          </div>

          {/* Nav groups */}
          <div className="flex-1 px-3 pb-4 space-y-1">
            {NAV_GROUPS.map((group) => {
              const isExpanded = expandedGroup === group.label
              const hasActive = group.items.some(i => pathname === i.href)

              return (
                <div key={group.label}>
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 hover:bg-white/[0.03]"
                    style={{
                      color: hasActive ? group.color : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-sm">{group.icon}</span>
                      <span>{group.label}</span>
                    </span>
                    <svg
                      className="w-3 h-3 transition-transform duration-200"
                      style={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        color: 'rgba(255,255,255,0.2)',
                      }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: isExpanded ? `${group.items.length * 44}px` : '0',
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="py-1 pl-2 space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative group/item"
                            style={{
                              color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                              }
                            }}
                          >
                            {/* Active indicator */}
                            {isActive && (
                              <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                                style={{
                                  background: group.color,
                                  boxShadow: `0 0 8px ${group.color}40`,
                                }}
                              />
                            )}
                            <span className="text-base">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom status */}
          <div className="px-4 pb-5">
            <div className="h-[1px] mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
            <div
              className="p-3 rounded-xl"
              style={{
                background: 'rgba(0,255,135,0.03)',
                border: '1px solid rgba(0,255,135,0.08)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff87] animate-pulse" />
                <span className="text-[10px] font-semibold text-[#00ff87] uppercase tracking-wider">
                  System Active
                </span>
              </div>
              <p className="text-[10px] text-white/20 leading-relaxed">
                34 chains monitored • Real-time protection
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar (separate element for clean transform) */}
      <style>{`
        @media (max-width: 1023px) {
          nav.fixed {
            transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
          }
        }
        @media (min-width: 1024px) {
          nav.fixed {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  )
}
