# SweepGuard Security Audit Report

**Date:** 2026-05-22
**Auditor:** Nishi (Automated Security Audit)
**Scope:** Full codebase — API routes, smart contracts, client-side code, middleware, dependencies, deployment config

---

## Critical Vulnerabilities (🔴 Must Fix)

### C1. Admin Authentication Bypass via Spoofable Header
**Files:** All `src/app/api/admin/*/route.ts` (7 routes)
**Lines:** `src/app/api/admin/route.ts:36`, `src/app/api/admin/payout/route.ts:19,64`, `src/app/api/admin/claims/route.ts:21`, `src/app/api/admin/referrals/route.ts:17`, `src/app/api/admin/stats/route.ts:25`, `src/app/api/admin/analytics/*/route.ts`

**Description:** Every admin endpoint authenticates by reading the `x-wallet-address` HTTP header and comparing it to a hardcoded admin address. This header is trivially forgeable by any client using `curl`, Postman, or browser DevTools. An attacker can set `x-wallet-address: 0x7A3725154a2E6468F9549334394802e9E2822C2A` and gain full admin access.

```typescript
// Every admin route does this — NO cryptographic verification
const wallet = request.headers.get('x-wallet-address')
if (!wallet || wallet.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Impact:** Full admin access — view all claims, execute payouts, view analytics, manage referrals. An attacker could drain the platform by issuing unauthorized payouts.

**Fix:** Implement cryptographic signature verification. Admin routes should require a signed message (e.g., `eth_sign` with a nonce and timestamp) that the server verifies against the expected admin public key. Never trust client-supplied headers for authentication.

---

### C2. Unauthenticated Admin Data Exposure — `/api/referral/track?admin=true`
**File:** `src/app/api/referral/track/route.ts:80-93`

**Description:** The GET endpoint accepts `?admin=true` as a query parameter and returns ALL claims in the system without any authentication. No header check, no signature, no token.

```typescript
const isAdmin = searchParams.get('admin') === 'true'
if (isAdmin) {
  // Returns ALL claims — no auth required
  return NextResponse.json({ claims: claimsStore, total: claimsStore.length })
}
```

**Impact:** Any anonymous user can enumerate all referral claims, claimer wallets, amounts, and referral codes. This is a complete data breach of the referral system.

**Fix:** Remove the `?admin=true` bypass entirely, or protect it with the same cryptographic auth used for other admin endpoints (once fixed per C1).

---

### C3. Invalid Admin Wallet Address in Root Admin Route
**File:** `src/app/api/admin/route.ts:4`

**Description:** The root admin route defines `ADMIN_WALLET = '0x59825337487449844982374897324987'` — this is NOT a valid 40-character Ethereum address (only 32 hex chars). This means NO valid wallet can pass the check, effectively locking out even the legitimate admin from this route. Conversely, the broken comparison could cause unexpected behavior in some implementations.

```typescript
const ADMIN_WALLET = '0x59825337487449844982374897324987' // 32 chars, not 40!
```

**Impact:** Admin cannot access the root admin endpoint. If the comparison logic is ever "fixed" loosely, it could allow unauthorized access.

**Fix:** Use the correct 42-character admin address: `0x7A3725154a2E6468F9549334394802e9E2822C2A` (consistent with all other admin routes).

---

### C4. Private Keys Accepted in HTTP Request Bodies
**Files:**
- `src/app/api/recover/route.ts` — accepts `privateKey` and `sponsorPrivateKey`
- `src/app/api/monitor/route.ts:18-22` — accepts `privateKey`
- `src/app/api/nft/route.ts:79,91` — accepts `privateKey`
- `src/app/api/solana/recover/route.ts:38` — accepts `privateKey`
- `src/app/api/airdrop/claim/route.ts:602,770` — accepts `privateKey` and `sponsorPrivateKey`

**Description:** Multiple API routes accept raw private keys in POST request bodies. Even though HTTPS encrypts transport, these keys are:
1. Logged in serverless function logs (Vercel captures request bodies in some configurations)
2. Visible in server memory during execution
3. Potentially captured by any middleware, WAF, or logging proxy
4. Never deleted from serverless function memory (garbage collection is non-deterministic)

**Impact:** If an attacker gains access to logs, monitoring systems, or memory dumps, they can extract private keys and drain wallets. This is the single highest-risk pattern in the entire codebase for a crypto application.

**Fix:** Never accept private keys server-side. Instead:
- Use client-side signing (MetaMask/WalletConnect) for all transactions
- For recovery of compromised wallets, use a client-side encrypted vault or a secure enclave
- If server-side signing is absolutely required, use a hardware security module (HSM) or AWS KMS
- At minimum, implement memory zeroing after key usage (`Buffer.fill(0)`)

---

### C5. Supabase Service Role Key Falls Back to Public Anon Key
**File:** `src/app/api/referral/route.ts:6-8`

**Description:** The referral route uses `SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY` as the Supabase client key. The `NEXT_PUBLIC_` prefix means the anon key is embedded in the client-side JavaScript bundle. If the service role key is not set, the server-side code runs with the same permissions as the public client — but more critically, if the service role key IS set and the code is copied elsewhere, it may leak.

```typescript
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Impact:** Service role keys bypass Row Level Security. If leaked, an attacker has full database access.

**Fix:** Never fall back to `NEXT_PUBLIC_` keys for server-side operations. If `SUPABASE_SERVICE_ROLE_KEY` is missing, fail explicitly rather than using a weaker key.

---

## High Vulnerabilities (🟠 Should Fix)

### H1. In-Memory Rate Limiting Resets on Cold Start
**Files:** `src/lib/rateLimit.ts`, `src/middleware.ts`, `src/app/api/relay/route.ts`

**Description:** All rate limiters use in-memory `Map` objects. On Vercel serverless, each function instance has its own memory, and instances are recycled frequently. An attacker can:
1. Get a fresh rate limit window by hitting a different serverless instance
2. Bypass rate limits entirely by sending requests in rapid succession (they'll be distributed across instances)

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
```

**Impact:** Rate limiting is effectively non-functional in production. Attackers can brute-force admin endpoints, spam recovery requests, and exhaust platform resources.

**Fix:** Use a distributed rate limiting store (Redis, Upstash, or Vercel KV). Example with Upstash:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(60, '1 m') })
```

---

### H2. IP-Based Rate Limiting Bypassed via X-Forwarded-For Spoofing
**Files:** `src/lib/rateLimit.ts:59-60`, `src/middleware.ts:52-53`

**Description:** The IP extraction trusts `x-forwarded-for` and `x-real-ip` headers without validation. On Vercel, the trusted proxy IP is in `x-vercel-forwarded-for`, but the code reads `x-forwarded-for` which can be spoofed by the client.

```typescript
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || request.headers.get('x-real-ip')
  || 'unknown'
```

**Impact:** An attacker can rotate `x-forwarded-for` headers to get unlimited requests, completely bypassing rate limits.

**Fix:** On Vercel, use `request.ip` or parse `x-vercel-forwarded-for`. For self-hosted, validate against known proxy IPs and always take the rightmost (most-trusted) IP from the chain.

---

### H3. API Key Generation Has No Authentication
**File:** `src/app/api/v1/keys/route.ts`

**Description:** The POST endpoint generates API keys with just an email address — no verification that the email belongs to the requester, no CAPTCHA, no authentication. An attacker can generate unlimited keys with random emails.

**Impact:** API key abuse, resource exhaustion, bypass of any downstream rate limiting keyed on API keys.

**Fix:** Require email verification (send a confirmation link) before issuing API keys. Add CAPTCHA for unauthenticated key generation.

---

### H4. FeeCollector Smart Contract — No Access Control on claimAndSplit
**File:** `contracts/FeeCollector.sol:37-56`

**Description:** The `claimAndSplit`, `batchClaimAndSplit`, and `claimETHAndSplit` functions have no access control — anyone can call them. While this is by design (the contract is meant to be called by anyone), the `claimData` parameter is arbitrary calldata that gets executed via `claimContract.call(claimData)`. An attacker could craft malicious `claimData` that calls any contract with any parameters.

```solidity
(bool success, ) = claimContract.call(claimData); // Arbitrary execution
```

**Impact:** The contract can be used as a proxy to execute arbitrary calls to any address, potentially draining tokens or manipulating other contracts. If the contract holds any tokens (from failed claims or rounding), they can be extracted.

**Fix:** Add a whitelist of allowed claim contracts, or restrict the caller to be the expected claimant address. Consider adding `onlyOwner` or a role-based access control.

---

### H5. No Security Headers Configured
**File:** `next.config.ts` (empty config)

**Description:** The Next.js config is empty — no security headers are set:
- No `Content-Security-Policy` (XSS protection)
- No `X-Frame-Options` (clickjacking protection)
- No `Strict-Transport-Security` (HSTS)
- No `X-Content-Type-Options` (MIME sniffing protection)
- No `Referrer-Policy`
- No `Permissions-Policy`

**Impact:** The app is vulnerable to clickjacking, MIME sniffing attacks, and lacks defense-in-depth against XSS.

**Fix:** Add security headers in `next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..." },
      ],
    }]
  },
}
```

---

### H6. In-Memory Data Stores — All State Lost on Cold Start
**Files:** `src/lib/apiAuth.ts`, `src/app/api/monitor/route.ts`, `src/app/api/referral/track/route.ts`, `src/app/api/v1/keys/route.ts`

**Description:** API keys, monitor state, referral claims, analytics data, and all other "stores" are in-memory Maps. On Vercel serverless:
- API keys generated in one instance are invisible to another
- Active monitors disappear on function recycle
- Referral claims are lost on cold start
- Analytics data is inconsistent

**Impact:** Data loss, unreliable monitoring, inability to track API usage. Users who generate API keys may find them non-functional on subsequent requests routed to different instances.

**Fix:** Migrate all persistent state to a database (Supabase, PlanetScale, or Vercel KV).

---

### H7. Relay/Gasless Endpoints — Server Wallet Private Key in Environment
**Files:** `src/app/api/relay/route.ts:16`, `src/app/api/gasless/route.ts:24`

**Description:** `RELAY_PRIVATE_KEY` is read from environment variables and used to sign transactions on behalf of users. This key:
1. Pays gas for all relay transactions
2. If compromised, an attacker can drain the relay wallet
3. Is a single point of failure for the entire gasless system

```typescript
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY || ''
const relayWallet = new ethers.Wallet(RELAY_PRIVATE_KEY, provider)
```

**Impact:** Compromise of this key = complete drain of the relay wallet's ETH balance across all chains.

**Fix:**
- Use a dedicated hot wallet with minimal funds (auto-refill from cold storage)
- Implement per-user nonce management to prevent replay
- Add transaction value limits per relay call
- Consider using a smart contract wallet with spending limits instead of an EOA

---

## Medium Vulnerabilities (🟡 Consider Fixing)

### M1. Unsanitized HTML via dangerouslySetInnerHTML
**Files:**
- `src/app/docs/[section]/page.tsx:897` — renders markdown as HTML
- `src/app/blog/[slug]/page.tsx:142` — renders blog content as HTML
- `src/app/layout.tsx:105,150` — renders structured data as HTML

**Description:** The docs page uses a custom regex-based markdown-to-HTML converter with no sanitization (no DOMPurify, no sanitize-html). While the content is currently hardcoded (not user-supplied), the `renderMarkdown` function does not escape HTML entities in the input, meaning if content is ever sourced from a CMS or user input, it becomes an XSS vector.

```typescript
// Custom markdown renderer — no HTML escaping
let html = md
  .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre...>$2</pre>')
  // ...
dangerouslySetInnerHTML={{ __html: html }} // Rendered raw
```

**Impact:** Currently low (hardcoded content), but high-risk if content source changes. The blog route is more concerning if blog posts come from an external source.

**Fix:** Use a proper markdown library (marked, remark) with HTML sanitization (DOMPurify or sanitize-html). Never use raw regex for markdown-to-HTML conversion.

---

### M2. Hardcoded Platform Fee Wallet — No Multi-Sig or Timelock
**Files:** `src/lib/fundRecovery.ts:38`, `src/lib/claimer.ts:27`, `src/app/api/gasless/route.ts:15`, `src/app/api/airdrop/claim/route.ts:8`, contracts

**Description:** The platform fee wallet `0x7A3725154a2E6468F9549334394802e9E2822C2A` is hardcoded in 5+ locations across both TypeScript and Solidity. If this wallet's private key is compromised, an attacker receives all platform fees. There's no multi-sig, no timelock, no rotation mechanism.

**Impact:** Single point of failure for all platform revenue.

**Fix:**
- Use a multi-sig wallet (Gnosis Safe) as the fee wallet
- Implement fee rotation capability in smart contracts
- Move the fee address to an environment variable or on-chain governance parameter

---

### M3. Smart Contract — ETH Transfer Without Return Value Check
**File:** `contracts/FeeCollector.sol:86-93`

**Description:** The `claimETHAndSplit` function uses low-level `call{value}` for ETH transfers but the return values are checked with `require`. However, the `claimContract.call{value: msg.value}(claimData)` on line 86 doesn't verify that the ETH was actually used correctly — the claim contract could simply keep the ETH.

```solidity
(bool success, ) = claimContract.call{value: msg.value}(claimData);
require(success, "Claim failed");
uint256 balance = address(this).balance; // Could include pre-existing balance
```

**Impact:** If the contract holds residual ETH from previous operations, the fee calculation will be wrong — the user's share includes previously trapped funds.

**Fix:** Track the balance before and after the claim call to calculate exactly what was claimed.

---

### M4. Gasless/Relay Signature Verification — Potential Replay Across Chains
**Files:** `src/app/api/gasless/route.ts`, `src/app/api/relay/route.ts`

**Description:** The EIP-712 signatures include `chainId` in the domain separator, which prevents cross-chain replay on different chains. However, the relay endpoints don't check if a signature has been used before (no nonce tracking for relay submissions). If the relay call fails after signature verification but before execution, the same signature could be retried.

**Impact:** Potential double-execution of relayed transactions under specific failure conditions.

**Fix:** Track used signatures (or signature hashes) in a persistent store and reject replays.

---

### M5. FeeCollector batchClaimAndSplit — Silent Failures
**File:** `contracts/FeeCollector.sol:74-97`

**Description:** In the batch function, failed claims are silently skipped (`if (!success) continue;`). This means:
1. Users don't know which claims failed
2. The function still emits `BatchClaimed` with the total count including failures
3. No revert on partial failure means users may not realize they lost tokens

```solidity
(bool success, ) = claimContracts[i].call(claimData);
if (!success) continue; // Silent failure
```

**Impact:** Users may believe all claims succeeded when some failed silently. Event logs are misleading.

**Fix:** Emit individual failure events or return a results array indicating success/failure per claim.

---

### M6. Monitor Route — Telegram/Discord Credentials in Request Body
**File:** `src/app/api/monitor/route.ts:18-22`

**Description:** The monitor route accepts `telegramBotToken`, `telegramChatId`, `discordWebhookUrl`, and `slackWebhookUrl` in the request body. These are stored in-memory and used to send alerts. An attacker could:
1. Provide a malicious webhook URL to intercept all alert data
2. Enumerate valid Telegram bot tokens by testing against the API

**Impact:** Alert interception, potential credential theft.

**Fix:** Pre-configure alert channels server-side. Don't accept arbitrary webhook URLs from clients.

---

## Low Vulnerabilities (🟢 Nice to Fix)

### L1. Known Vulnerable Dependencies (npm audit)
**Vulnerabilities found:**
- `postcss` (via Next.js) — Moderate: Line return parsing
- `uuid` (via Solana web3.js) — High: Predictable IDs
- `ws` (via ethers.js) — High: ReDoS vulnerability

**Impact:** These are transitive dependencies and unlikely to be directly exploitable in this context, but they should be updated.

**Fix:** Run `npm audit fix` and update Next.js, @solana/web3.js, and ethers.js to latest versions.

---

### L2. No CORS Configuration
**File:** `next.config.ts`

**Description:** No CORS headers are configured. By default, Next.js allows same-origin requests only, which is fine for the web app. However, the API routes serve a white-label API (`/api/v1/`) that external clients need to access.

**Impact:** External API consumers may face CORS issues. More importantly, without explicit CORS policy, any origin can make same-site requests if cookies are involved.

**Fix:** Configure CORS for API routes (allow specific origins for the white-label API, deny for admin routes).

---

### L3. Error Messages Leak Internal Details
**Files:** Various API routes

**Description:** Some error responses include internal details:
- `src/app/api/relay/route.ts:91`: `'Server relay not configured. Set RELAY_PRIVATE_KEY environment variable.'`
- `src/app/api/gasless/route.ts:251`: `Signature mismatch. Expected ${message.hackedWallet}, got ${recoveredAddress}`
- `src/app/api/nft/route.ts:142`: Raw error messages from ethers.js

**Impact:** Information disclosure about internal configuration and wallet addresses.

**Fix:** Use generic error messages for production. Log detailed errors server-side only.

---

### L4. Next.js Config Missing Security Defaults
**File:** `next.config.ts`

**Description:** The config is completely empty. Missing:
- `poweredByHeader: false` (removes `X-Powered-By: Next.js` header)
- `reactStrictMode: true`
- Image optimization security settings

**Fix:** At minimum: `{ poweredByHeader: false, reactStrictMode: true }`

---

## Positive Findings (✅ Good Security Practices)

1. **Input Validation Library** (`src/lib/validation.ts`): Consistent use of `isValidAddress()` and `isValidTxHash()` across routes. Error messages are sanitized via `sanitizeErrorMessage()`.

2. **EIP-712 Signature Verification**: The gasless and relay routes properly verify typed data signatures using `verifyTypedData()` from ethers.js, preventing signature forgery.

3. **EIP-7702 Nonce Protection** (SweepGuardClaimer.sol): Smart contract uses nonces to prevent replay attacks of claim signatures.

4. **Flashbots Private Submission**: Recovery transactions use Flashbots for private transaction submission, preventing MEV/sandwich attacks during recovery.

5. **Rate Limiting on Recovery Routes**: The scan, recover, and panic routes all have rate limiting (even if in-memory).

6. **Address Validation Consistency**: The codebase consistently validates Ethereum addresses with regex `/^0x[0-9a-fA-F]{40}$/` before use.

7. **Fee Capped at 50% On-Chain** (SweepGuardRescuer.sol): `require(_feePercent <= 50)` prevents malicious fee configuration.

8. **Solana Recovery Uses Jito**: Private transaction submission for Solana recovery prevents front-running.

9. **Error Sanitization**: `sanitizeErrorMessage()` in `src/lib/validation.ts` strips sensitive info from error responses.

10. **NFT Rescue Capability**: The recovery system includes NFT scanning and rescue — good feature for compromised wallets.

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 High | 7 |
| 🟡 Medium | 6 |
| 🟢 Low | 4 |
| ✅ Positive | 10 |
| **Total Issues** | **22** |

---

## Recommendations (Priority-Ordered)

### Immediate (This Week)
1. **Fix admin authentication** (C1, C2, C3) — Implement wallet signature verification for all admin routes. Remove the `?admin=true` bypass.
2. **Remove private key acceptance from API routes** (C4) — Move signing to client-side. If server-side is required, use HSM/KMS.
3. **Fix Supabase key fallback** (C5) — Fail explicitly when service role key is missing.

### Short-Term (This Sprint)
4. **Deploy distributed rate limiting** (H1, H2) — Use Upstash Redis or Vercel KV.
5. **Add security headers** (H5) — CSP, X-Frame-Options, HSTS, etc.
6. **Add authentication to API key generation** (H3) — Email verification + CAPTCHA.
7. **Migrate in-memory stores to database** (H6) — Supabase or Vercel KV for all persistent state.

### Medium-Term (Next Sprint)
8. **Sanitize HTML output** (M1) — Use DOMPurify for markdown rendering.
9. **Implement relay nonce tracking** (M4) — Prevent signature replay.
10. **Add multi-sig to fee wallet** (M2) — Gnosis Safe for platform fees.
11. **Update vulnerable dependencies** (L1) — `npm audit fix`.

### Long-Term (Backlog)
12. **Implement CSP headers** with proper nonce generation.
13. **Add CORS configuration** for white-label API.
14. **Smart contract audit** by professional firm before mainnet deployment.
15. **Implement proper logging/monitoring** (replace console.error with structured logging).
