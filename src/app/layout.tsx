import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SweepGuard — Auto-Sweep Wallet Protection",
  description: "Protect compromised wallets from drainer attacks. Auto-sweep incoming funds to your safe wallet before hackers can drain them.",
  keywords: ["wallet protection", "drainer", "EIP-7702", "auto-sweep", "crypto security", "EVM"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
