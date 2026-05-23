'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Animated Particles Background ──────────────────────────
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.05
      })
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.03 * (1 - dist / 150)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      
      // Draw particles
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 255, 136, ${p.opacity})`
        ctx.fill()
        
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })
      
      animationId = requestAnimationFrame(draw)
    }
    draw()
    
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])
  
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.6 }} />
}

// ── Glowing Orb ────────────────────────────────────────────
function GlowOrb({ color, size, top, left, delay }: { color: string; size: number; top: string; left: string; delay: number }) {
  return (
    <div
      className="absolute rounded-full blur-[100px] animate-pulse"
      style={{
        background: color,
        width: size,
        height: size,
        top,
        left,
        animationDelay: `${delay}s`,
        animationDuration: '4s'
      }}
    />
  )
}

// ── Animated Counter ───────────────────────────────────────
function AnimatedCounter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const duration = 2000
          const startTime = Date.now()
          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * end))
            if (progress < 1) requestAnimationFrame(animate)
          }
          animate()
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end])
  
  return <div ref={ref}>{prefix}{count}{suffix}</div>
}

// ── Feature Card ───────────────────────────────────────────
function FeatureCard({ icon, title, desc, href, color }: { icon: string; title: string; desc: string; href: string; color: string }) {
  return (
    <Link href={href} className="group relative">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }} />
      <div className="relative p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-sm
        hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1">
        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-green-400 transition-colors">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
        <div className="absolute bottom-4 right-4 text-green-500/0 group-hover:text-green-500/60 transition-all duration-300">
          →
        </div>
      </div>
    </Link>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function Home() {
  const [walletAddress, setWalletAddress] = useState('')
  const [addressError, setAddressError] = useState('')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isLoaded, setIsLoaded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    setIsLoaded(true)
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])
  
  const handleScan = (e: React.MouseEvent) => {
    if (!walletAddress.trim()) {
      e.preventDefault()
      setAddressError('Enter a wallet address first')
      return
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress.trim())) {
      e.preventDefault()
      setAddressError('Invalid address format')
      return
    }
    setAddressError('')
  }

  const navLinks = [
    { href: '/scan', label: 'Scan', icon: '🔍' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/recover', label: 'Recover', icon: '💰' },
    { href: '/tracker', label: 'Tracker', icon: '🔗' },
    { href: '/airdrop', label: 'Airdrop', icon: '🎁' },
    { href: '/wallets', label: 'Wallets', icon: '💼' },
  ]

  return (
    <main className="min-h-screen bg-[#030305] text-white overflow-hidden">
      {/* Cursor glow effect */}
      <div
        className="fixed w-[600px] h-[600px] rounded-full pointer-events-none z-0 transition-transform duration-100"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)',
          transform: `translate(${mousePos.x - 300}px, ${mousePos.y - 300}px)`
        }}
      />

      {/* Background layers */}
      <div className="fixed inset-0 pointer-events-none">
        <ParticleField />
        <GlowOrb color="rgba(0,255,136,0.08)" size={600} top="-20%" left="-10%" delay={0} />
        <GlowOrb color="rgba(0,229,255,0.05)" size={500} top="60%" left="70%" delay={2} />
        <GlowOrb color="rgba(168,85,247,0.04)" size={400} top="30%" left="50%" delay={4} />
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50">
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 rounded-lg blur-lg group-hover:bg-green-500/50 transition-all" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-green-500/20">
                🛡️
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              SweepGuard
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all duration-200"
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="ml-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-sm font-medium hover:from-green-500 hover:to-emerald-500 transition-all cursor-pointer shadow-lg shadow-green-500/20">
              <Link href="/scan">Start Scan →</Link>
            </div>
          </div>

          {/* Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#030305]/95 backdrop-blur-xl border-b border-white/[0.05] p-6">
            <div className="grid grid-cols-2 gap-3">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 bg-white/[0.03] rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  {link.icon} {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 md:pt-28 pb-20">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/[0.08] border border-green-500/20 text-green-400 text-xs font-medium mb-8 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live on 34 chains + Solana
        </div>

        {/* Main title */}
        <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[0.9] max-w-5xl transition-all duration-1000 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="block text-white/90">Protect Your</span>
          <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent mt-2">
            Crypto Assets
          </span>
        </h1>

        {/* Subtitle */}
        <p className={`text-gray-500 text-center mt-8 max-w-2xl text-lg md:text-xl leading-relaxed transition-all duration-1000 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          Auto-sweep incoming funds before hackers drain them. Track stolen assets across 34 chains. Claim airdrops safely. All from one dashboard.
        </p>

        {/* Search bar */}
        <div className={`mt-12 w-full max-w-2xl transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden group-hover:border-white/[0.15] transition-colors">
              <div className="pl-5 text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                value={walletAddress}
                onChange={e => { setWalletAddress(e.target.value); setAddressError('') }}
                placeholder="Enter wallet address (0x...)"
                className="flex-1 px-4 py-5 bg-transparent text-white placeholder:text-gray-600 focus:outline-none text-base"
              />
              <Link
                href={walletAddress ? `/scan?address=${walletAddress}` : '#'}
                onClick={handleScan}
                className="mr-2 px-7 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all whitespace-nowrap shadow-lg shadow-green-500/20"
              >
                Scan Now
              </Link>
            </div>
          </div>
          {addressError && (
            <p className="text-red-400 text-sm mt-3 text-center animate-pulse">⚠ {addressError}</p>
          )}
          <p className="text-gray-700 text-xs mt-4 text-center">
            Supports Ethereum, Base, BSC, Arbitrum, Polygon, Optimism, Avalanche, Solana + 27 more chains
          </p>
        </div>

        {/* Stats row */}
        <div className={`grid grid-cols-3 gap-12 mt-20 transition-all duration-1000 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { value: 34, label: 'Chains', suffix: '+' },
            { value: 1, label: 'Second Detection', prefix: '<', suffix: 's' },
            { value: 24, label: 'Protection', suffix: '/7' },
          ].map((stat, i) => (
            <div key={i} className="text-center group">
              <div className="text-3xl md:text-4xl font-black text-white group-hover:text-green-400 transition-colors">
                {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-gray-600 text-xs mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/[0.06] border border-green-500/10 text-green-500 text-xs font-medium mb-4">
            FEATURES
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white/90">Everything You Need</h2>
          <p className="text-gray-600 mt-4 max-w-xl mx-auto">Complete crypto security platform — from scanning to recovery to protection.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard icon="🔍" title="Multi-Chain Scanner" desc="Scan 34 chains simultaneously for assets, approvals, and vulnerabilities." href="/scan" color="#00ff87" />
          <FeatureCard icon="⚡" title="Auto-Sweep" desc="Real-time monitoring. Funds moved to safety before hackers can react." href="/dashboard" color="#00e5ff" />
          <FeatureCard icon="🔗" title="Fund Tracker" desc="Trace stolen funds across chains. See if they reached an exchange." href="/tracker" color="#a855f7" />
          <FeatureCard icon="🎁" title="Airdrop Claimer" desc="Claim airdrops from compromised wallets. Tokens go to your safe wallet." href="/airdrop" color="#f59e0b" />
          <FeatureCard icon="💰" title="Fund Recovery" desc="Automated recovery tools. Flashbots bundles. Gas sponsorship." href="/recover" color="#ef4444" />
          <FeatureCard icon="💼" title="Multi-Wallet" desc="Manage multiple wallets. Track all from one unified dashboard." href="/wallets" color="#8b5cf6" />
          <FeatureCard icon="📊" title="Portfolio" desc="Real-time portfolio tracking across all chains with live prices." href="/portfolio" color="#06b6d4" />
          <FeatureCard icon="⛽" title="Gas Optimizer" desc="Best time to transact. Gas predictions. Savings calculator." href="/gas-optimizer" color="#f97316" />
          <FeatureCard icon="🛡️" title="Contract Audit" desc="Instant smart contract audit. Vulnerability detection. Security score." href="/audit-bot" color="#10b981" />
          <FeatureCard icon="🐋" title="Whale Tracker" desc="Follow whale wallets. Smart money alerts. Portfolio tracking." href="/whale-tracker" color="#3b82f6" />
          <FeatureCard icon="🚨" title="Drainer Map" desc="Real-time drainer activity. Chain-by-chain breakdown. Threat intel." href="/drainer-map" color="#ec4899" />
          <FeatureCard icon="🔐" title="Hardware Wallet" desc="Ledger, Trezor, air-gapped signing. Transaction verification." href="/hardware-wallet" color="#6366f1" />
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/[0.06] border border-cyan-500/10 text-cyan-500 text-xs font-medium mb-4">
            HOW IT WORKS
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white/90">Simple. Fast. Secure.</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: '01', icon: '🔍', title: 'Scan', desc: 'Paste your wallet address. We check all 34 chains instantly.' },
            { step: '02', icon: '📊', title: 'Analyze', desc: 'See risks, approvals, stolen funds, and recovery options.' },
            { step: '03', icon: '🛡️', title: 'Protect', desc: 'Enable auto-sweep. Set up alerts. Revoke dangerous approvals.' },
            { step: '04', icon: '✅', title: 'Relax', desc: '24/7 monitoring. Funds safe. Alerts when anything happens.' },
          ].map((item, i) => (
            <div key={i} className="relative group">
              {i < 3 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent z-0" />
              )}
              <div className="relative p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-cyan-500/20 transition-all duration-300 hover:-translate-y-1">
                <div className="text-cyan-500/30 text-xs font-mono mb-3">{item.step}</div>
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24 max-w-4xl mx-auto">
        <div className="relative p-12 bg-gradient-to-br from-green-500/[0.06] to-cyan-500/[0.06] border border-green-500/10 rounded-3xl text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <div className="relative">
            <div className="text-5xl mb-6">🛡️</div>
            <h2 className="text-3xl md:text-4xl font-black text-white/90 mb-4">Start Protecting Now</h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-8">Don&apos;t wait for the next hack. Scan your wallet in seconds. Enable auto-sweep. Sleep peacefully.</p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all shadow-xl shadow-green-500/20"
            >
              Scan My Wallet →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-sm">🛡️</div>
            <span className="font-bold text-white/60">SweepGuard</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { href: '/scan', label: 'Scan' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/recover', label: 'Recover' },
              { href: 'https://github.com/kabla1696-ctrl/sweeptsguard', label: 'GitHub' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="text-sm text-gray-600 hover:text-green-400 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="text-gray-700 text-xs">Open Source Wallet Protection</div>
        </div>
      </footer>
    </main>
  )
}
