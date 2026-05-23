'use client'

export default function CryptoSecurityBestPracticesPage() {
  const practices = [
    { icon: '🔐', title: 'Use Hardware Wallets', risk: 'critical', desc: 'Store significant holdings on hardware wallets (Ledger, Trezor). Private keys never leave the device.' },
    { icon: '✅', title: 'Audit Token Approvals', risk: 'high', desc: 'Regularly check and revoke unnecessary token approvals. Unlimited approvals are the #1 attack vector.' },
    { icon: '🔗', title: 'Verify Contract Addresses', risk: 'high', desc: 'Always verify contract addresses on Etherscan before interacting. Bookmark official protocol URLs.' },
    { icon: '💰', title: 'Use Separate Wallets', risk: 'medium', desc: 'Keep a "hot wallet" for daily DeFi and a "cold wallet" for holdings. Never connect your main wallet to unknown dApps.' },
    { icon: '🛡️', title: 'Enable Transaction Simulation', risk: 'medium', desc: 'Use wallets or extensions that simulate transactions before signing. See exactly what will happen.' },
    { icon: '⚠️', title: 'Beware of Phishing', risk: 'critical', desc: 'Never click links from DMs, emails, or Discord. Always navigate directly to protocol websites.' },
    { icon: '🔑', title: 'Never Share Seed Phrases', risk: 'critical', desc: 'No legitimate service will ever ask for your seed phrase. Anyone who asks is a scammer.' },
    { icon: '📊', title: 'Monitor Whale Movements', risk: 'low', desc: 'Track large transactions to/from your wallet. Early detection of unauthorized transfers is crucial.' },
  ]

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full blur-[100px] animate-pulse" style={{ background: 'rgba(0,229,255,0.05)', width: 500, height: 500, top: '20%', right: '-10%' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <span className="text-xs text-cyan-400 font-mono uppercase tracking-wider">Blog / Best Practices</span>
        <h1 className="text-4xl md:text-5xl font-black mt-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Crypto Wallet Security Best Practices 2026
        </h1>
        <p className="text-gray-500 mt-4">The essential security checklist every crypto user needs. Protect your assets from drainers, phishing, and smart contract exploits.</p>
        <div className="flex gap-4 mt-4 text-xs text-gray-600">
          <span>📅 May 22, 2026</span>
          <span>⏱️ 6 min read</span>
          <span>🏷️ Security, Best Practices</span>
        </div>

        <div className="mt-12 space-y-4">
          {practices.map((p, i) => (
            <div key={i} className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{p.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white/90">{p.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.risk === 'critical' ? 'bg-red-500/20 text-red-400' :
                      p.risk === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      p.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {p.risk}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2">{p.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl">
          <h3 className="text-xl font-bold text-cyan-400 mb-2">Scan Your Wallet Now</h3>
          <p className="text-gray-400 text-sm mb-4">Check if your wallet has any vulnerabilities, suspicious approvals, or exposure to known drainer contracts.</p>
          <a href="/scan" className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-semibold text-sm hover:from-cyan-500 hover:to-blue-500 transition-all">
            Scan Wallet →
          </a>
        </div>
      </div>
    </div>
  )
}
