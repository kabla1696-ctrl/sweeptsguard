# SweepGuard API Documentation

## Overview

The SweepGuard API provides programmatic access to wallet scanning, drainer detection, reputation checking, gas prices, and airdrop information.

**Base URL:** `https://sweeptsguard.vercel.app/api/v1`

## Authentication

All API requests support optional authentication via API key. Authenticated requests have higher rate limits.

### Passing Your API Key

You can pass your API key in three ways:

1. **Authorization Header** (recommended):
   ```
   Authorization: Bearer sg_free_your_api_key_here
   ```

2. **X-API-Key Header:**
   ```
   X-API-Key: sg_free_your_api_key_here
   ```

3. **Query Parameter:**
   ```
   ?api_key=sg_free_your_api_key_here
   ```

### Getting an API Key

```bash
curl -X POST https://sweeptsguard.vercel.app/api/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "free"}'
```

## Rate Limits

| Tier | Requests/Day | Requests/Month |
|------|-------------|----------------|
| Free (no key) | 50 | N/A |
| Free (with key) | 100 | 3,000 |
| Pro | 500 | 10,000 |

Rate limit headers are included in every response:
- `X-RateLimit-Limit` — Your daily limit
- `X-RateLimit-Remaining` — Remaining requests today
- `X-RateLimit-Reset` — When the limit resets (ISO timestamp)
- `X-RateLimit-Tier` — Your current tier

---

## Endpoints

### 1. Scan Wallet

Scan a wallet address across all supported chains for assets, delegations, and threats.

```
GET /api/v1/scan?address=0x...&chain=ethereum
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | EVM wallet address (0x...) |
| `chain` | string | No | Filter to specific chain name |

**Example:**
```bash
curl "https://sweeptsguard.vercel.app/api/v1/scan?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "assets": [...],
    "totalUsdValue": 1234.56,
    "delegation": { "hasDelegation": false },
    "delegations": [],
    "recentDrains": [],
    "suspiciousApprovals": [],
    "chains": [1, 8453, 42161]
  },
  "meta": {
    "address": "0xd8dA...",
    "chainFilter": "all",
    "timestamp": "2026-05-22T01:00:00.000Z"
  }
}
```

---

### 2. Check Drainer

Check if an address is a known drainer.

```
GET /api/v1/drainers?address=0x...
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | EVM address to check |

**Example:**
```bash
curl "https://sweeptsguard.vercel.app/api/v1/drainers?address=0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xCce0A2eBE17c5E532802896Fc8AfCaaB8aBD8ba0",
    "isDrainer": true,
    "details": {
      "name": "Inferno Drainer (EIP-7702)",
      "type": "eip7702",
      "chains": [1],
      "reportCount": 150,
      "verified": true
    }
  }
}
```

### Report Drainer (POST)

```
POST /api/v1/drainers
Content-Type: application/json

{
  "address": "0x...",
  "evidence": "Drained 5 ETH from wallet via fake Uniswap site",
  "type": "eip7702"
}
```

*Requires API key.*

---

### 3. Address Reputation

Get a reputation score for an address.

```
GET /api/v1/reputation?address=0x...&chainId=1
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `address` | string | Yes | EVM address |
| `chainId` | number | No | Chain ID (default: 1 = Ethereum) |

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "score": 75,
    "level": "trusted",
    "txCount": 1542,
    "ageInDays": 365,
    "isContract": false,
    "tags": ["EOA"],
    "details": ["Address is 1+ years old", "Has significant transaction history"]
  }
}
```

---

### 4. Gas Prices

Get current gas prices for supported chains.

```
GET /api/v1/gas
GET /api/v1/gas?chainId=1
GET /api/v1/gas?chain=ethereum
```

**Response (all chains):**
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "chainId": 1,
        "chainName": "Ethereum",
        "gasPrices": { "slow": 5.2, "standard": 8.5, "fast": 12.1 },
        "unit": "gwei",
        "baseFee": "4.2"
      }
    ],
    "count": 33
  }
}
```

---

### 5. Check Airdrops

Check available airdrops for a wallet.

```
GET /api/v1/airdrops?address=0x...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "totalChains": 33,
    "airdrops": [
      {
        "chainId": 1,
        "chainName": "Ethereum",
        "airdrops": [
          {
            "name": "Ethereum Token Airdrop",
            "status": "check_required",
            "estimatedValue": "Unknown"
          }
        ]
      }
    ]
  }
}
```

---

### 6. API Key Management

#### Generate Key
```bash
curl -X POST https://sweeptsguard.vercel.app/api/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "tier": "free"}'
```

#### Check Key Status
```bash
curl "https://sweeptsguard.vercel.app/api/v1/keys?key=sg_free_..."
```

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | API key required |
| 403 | API key deactivated |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## SDKs & Integration

### JavaScript/TypeScript
```typescript
const response = await fetch('https://sweeptsguard.vercel.app/api/v1/scan?address=0x...', {
  headers: { 'Authorization': 'Bearer sg_free_your_key' }
})
const data = await response.json()
```

### Python
```python
import requests

response = requests.get(
    'https://sweeptsguard.vercel.app/api/v1/scan',
    params={'address': '0x...'},
    headers={'Authorization': 'Bearer sg_free_your_key'}
)
data = response.json()
```

### cURL
```bash
curl -H "Authorization: Bearer sg_free_your_key" \
  "https://sweeptsguard.vercel.app/api/v1/scan?address=0x..."
```

---

## Support

- **GitHub:** [github.com/kabla1696-ctrl/sweeptsguard](https://github.com/kabla1696-ctrl/sweeptsguard)
- **API Docs:** [sweeptsguard.vercel.app/api-docs](https://sweeptsguard.vercel.app/api-docs)
