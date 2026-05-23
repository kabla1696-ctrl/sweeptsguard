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
      { href: '/scam-shield', label: 'Scam Shield', icon: '🛡️' },
      { href: '/reputation', label: 'Reputation', icon: '⭐' },
      { href: '/approvals', label: 'Token Approvals', icon: '📋' },
      { href: '/panic', label: 'Panic Button', icon: '🚨' },
      { href: '/honey-token', label: 'Honey Token', icon: '🍯' },
      { href: '/security-quests', label: 'Security Quests', icon: '🏆' },
      { href: '/contract-verify', label: 'Contract Verify', icon: '✅' },
      { href: '/screenshot-scan', label: 'Screenshot Scan', icon: '📸' },
      { href: '/risk-heatmap', label: 'Risk Heatmap', icon: '🌡️' },
      { href: '/admin', label: 'Admin Dashboard', icon: '👑' },
    ],
  },
  {
    label: 'Monitor',
    icon: '📡',
    color: '#00e5ff',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
      { href: '/ai-threat', label: 'AI Threat Intel', icon: '🧠' },
      { href: '/wallet-health', label: 'Wallet Health Score', icon: '❤️' },
      { href: '/whale-alerts', label: 'Whale Alerts', icon: '🐋' },
      { href: '/whale-tracker', label: 'Whale Tracker', icon: '🐳' },
      { href: '/drainer-map', label: 'Live Drainer Map', icon: '🗺️' },
      { href: '/dark-web', label: 'Dark Web Monitor', icon: '🕵️' },
      { href: '/tracker', label: 'Fund Tracker', icon: '📍' },
      { href: '/alert-network', label: 'Alert Network', icon: '🔔' },
      { href: '/emergency-alerts', label: 'Emergency Alerts', icon: '🆘' },
      { href: '/bot', label: 'Bot Monitor', icon: '🤖' },
      { href: '/bot-scan', label: 'Bot Scanner', icon: '🔎' },
      { href: '/voice-alerts', label: 'Voice Alerts', icon: '🔊' },
      { href: '/sessions', label: 'Session Manager', icon: '🔑' },
    ],
  },
  {
    label: 'Recover',
    icon: '🆘',
    color: '#a855f7',
    items: [
      { href: '/recover', label: 'Recover Funds', icon: '💰' },
      { href: '/freeze', label: 'Freeze Request', icon: '🧊' },
      { href: '/multi-sig', label: 'Multi-Sig Recovery', icon: '🏛️' },
      { href: '/social-recovery', label: 'Social Recovery', icon: '🤝' },
      { href: '/insurance', label: 'Insurance', icon: '🛡️' },
      { href: '/nft', label: 'NFT Rescue', icon: '🖼️' },
      { href: '/referral', label: 'Referral Program', icon: '🤝' },
    ],
  },
  {
    label: 'Tools',
    icon: '🔧',
    color: '#f59e0b',
    items: [
      { href: '/wallets', label: 'Wallet Manager', icon: '💼' },
      { href: '/portfolio', label: 'Portfolio', icon: '📈' },
      { href: '/airdrop', label: 'Airdrop Claimer', icon: '🎁' },
      { href: '/airdrop-hunter', label: 'Airdrop Hunter', icon: '🎯' },
      { href: '/history', label: 'TX History', icon: '📜' },
      { href: '/tax-report', label: 'Tax Report', icon: '🧾' },
      { href: '/gas-optimizer', label: 'Gas Optimizer', icon: '⛽' },
      { href: '/defi-protector', label: 'DeFi Protector', icon: '🏦' },
      { href: '/time-lock', label: 'Time Lock', icon: '⏰' },
      { href: '/alias', label: 'Wallet Alias', icon: '📛' },
    ],
  },
  {
    label: 'Advanced',
    icon: '⚡',
    color: '#00e5ff',
    items: [
      { href: '/cross-chain', label: 'Cross-Chain Linking', icon: '⛓️' },
      { href: '/family', label: 'Family Protection', icon: '👨‍👩‍👧‍👦' },
      { href: '/extension', label: 'Browser Extension', icon: '🧩' },
      { href: '/analytics', label: 'Analytics', icon: '📈' },
      { href: '/defi', label: 'DeFi Integration', icon: '🏦' },
      { href: '/bridge', label: 'Bridge', icon: '🌉' },
      { href: '/gas', label: 'Gas Tracker', icon: '⛽' },
      { href: '/solana', label: 'Solana', icon: '◎' },
      { href: '/hardware-wallet', label: 'Hardware Wallet', icon: '🔐' },
      { href: '/offline', label: 'Offline Mode', icon: '📴' },
      { href: '/white-label', label: 'White Label', icon: '🏷️' },
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

          {/* Social Links */}
          <div className="px-4 pb-3">
            <div className="h-[1px] mb-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
            <div className="flex items-center justify-center gap-4">
              <a href="https://x.com/SweepGuard_io" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/[0.05] transition-all" title="Twitter/X">
                <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/kabla1696-ctrl/sweeptsguard" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-500/[0.05] transition-all" title="GitHub">
                <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://discord.gg/sweeptsguard" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] transition-all" title="Discord">
                <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
              </a>
              <Link href="/blog" className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.06] hover:border-green-500/30 hover:bg-green-500/[0.05] transition-all" title="Blog">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
              </Link>
            </div>
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
