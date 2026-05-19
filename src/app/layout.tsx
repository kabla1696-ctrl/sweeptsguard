import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweepGuard — Auto-Sweep Wallet Protection",
  description: "Protect compromised wallets from drainer attacks. Auto-sweep incoming funds to your safe wallet before hackers can drain them.",
  keywords: ["wallet protection", "drainer", "EIP-7702", "auto-sweep", "crypto security", "EVM"],
  manifest: "/manifest.json",
  themeColor: "#22c55e",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
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
        <meta name="theme-color" content="#22c55e" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}) }`
          }}
        />
        {children}
      </body>
    </html>
  );
}
