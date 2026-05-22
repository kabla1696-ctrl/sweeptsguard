import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "SweepGuard — Recover Hacked Wallets | Multi-Chain Crypto Recovery",
  description: "Recover stolen crypto from hacked wallets. Flashbots private TX, EIP-7702 delegation, 33+ chains. Zero fund loss guarantee.",
  keywords: ["crypto recovery", "hacked wallet", "flashbots", "EIP-7702", "drainer", "sweep", "wallet protection", "auto-sweep", "crypto security", "EVM", "PWA", "Solana", "SPL tokens"],
  openGraph: {
    title: "SweepGuard — Multi-Chain Wallet Recovery",
    description: "Recover stolen crypto from compromised wallets across 33+ chains",
    url: "https://sweeptsguard.vercel.app",
    siteName: "SweepGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SweepGuard — Recover Hacked Wallets",
    description: "Flashbots private TX, EIP-7702, 33+ chains. Zero fund loss guarantee.",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SweepGuard",
    "mobile-web-app-capable": "yes",
    "application-name": "SweepGuard",
    "msapplication-TileColor": "#8b5cf6",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SweepGuard" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      </head>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[SW] Registered:', reg.scope);
                      // Check for updates every 60 minutes
                      setInterval(function() { reg.update(); }, 3600000);
                    })
                    .catch(function(err) { console.log('[SW] Registration failed:', err); });
                });
              }
              // Listen for install prompt
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
            `
          }}
        />
        <Navigation />
        <div className="lg:ml-64">
          {children}
        </div>
      </body>
    </html>
  );
}
