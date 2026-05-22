import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "SweepGuard — Protect Your Crypto Wallet | Multi-Chain Security",
  description: "Protect your crypto from hackers. Flashbots private TX, EIP-7702 delegation, 33+ chains. Auto-sweep, fund recovery, real-time monitoring. Zero fund loss guarantee.",
  keywords: ["crypto recovery", "hacked wallet", "flashbots", "EIP-7702", "drainer", "sweep", "wallet protection", "auto-sweep", "crypto security", "EVM", "PWA", "Solana", "SPL tokens"],
  openGraph: {
    title: "SweepGuard — Multi-Chain Wallet Protection",
    description: "Protect your crypto from hackers across 33+ chains. Auto-sweep, fund recovery, real-time monitoring.",
    url: "https://sweeptsguard.vercel.app",
    siteName: "SweepGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SweepGuard — Protect Your Crypto Wallet",
    description: "Flashbots private TX, EIP-7702, 33+ chains. Zero fund loss guarantee.",
    creator: "@SweepGuard_io",
    site: "@SweepGuard_io",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SweepGuard",
    "mobile-web-app-capable": "yes",
    "application-name": "SweepGuard",
    "msapplication-TileColor": "#00ff87",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050507",
};

function ParticleField() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Large gradient orbs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30 animate-mesh-move"
        style={{
          top: '-20%',
          left: '-15%',
          background: 'radial-gradient(circle, rgba(0,255,135,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-mesh-move"
        style={{
          bottom: '-10%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '-7s',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 animate-mesh-move"
        style={{
          top: '40%',
          right: '25%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '-14s',
        }}
      />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 dot-grid opacity-40" />

      {/* Floating particles — CSS only */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0
              ? 'rgba(0,255,135,0.4)'
              : i % 3 === 1
                ? 'rgba(0,229,255,0.3)'
                : 'rgba(168,85,247,0.3)',
            animationDuration: `${4 + Math.random() * 6}s`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

function CursorGlow() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var glow = document.createElement('div');
            glow.style.cssText = 'position:fixed;width:400px;height:400px;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(0,255,135,0.06) 0%,transparent 70%);transition:opacity 0.3s;opacity:0;';
            document.body.appendChild(glow);
            var timeout;
            document.addEventListener('mousemove', function(e) {
              glow.style.left = e.clientX + 'px';
              glow.style.top = e.clientY + 'px';
              glow.style.opacity = '1';
              clearTimeout(timeout);
              timeout = setTimeout(function() { glow.style.opacity = '0'; }, 2000);
            });
          })();
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050507" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SweepGuard" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" style={{ background: '#050507' }}>
        <CursorGlow />
        <ParticleField />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[SW] Registered:', reg.scope);
                      setInterval(function() { reg.update(); }, 3600000);
                    })
                    .catch(function(err) { console.log('[SW] Registration failed:', err); });
                });
              }
              var deferredPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                deferredPrompt = e;
                window.dispatchEvent(new Event('pwa-installable'));
              });
              window.__pwaInstall = function() {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  return deferredPrompt.userChoice.then(function(r) {
                    deferredPrompt = null;
                    return r.outcome;
                  });
                }
                return Promise.resolve('unavailable');
              };
            `,
          }}
        />

        <div className="relative z-10 min-h-screen">
          <Navigation />
          <div className="lg:ml-72 transition-all duration-300">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
