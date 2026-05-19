// Exchange Freeze Request Generator
// Generate freeze request templates for major exchanges

export interface FreezeRequestData {
  victimAddress: string
  drainerAddress: string
  exchangeName: string
  depositTxHash: string
  amount: string
  asset: string
  chainName: string
  timestamp: number
  policeReportNumber?: string
  caseNumber?: string
}

export interface ExchangeTemplate {
  name: string
  email: string
  supportUrl: string
  freezeWindow: string // How quickly you need to act
  requiredDocs: string[]
  template: (data: FreezeRequestData) => string
}

// Exchange freeze request templates
export const EXCHANGE_TEMPLATES: Record<string, ExchangeTemplate> = {
  binance: {
    name: 'Binance',
    email: 'report@binance.com',
    supportUrl: 'https://www.binance.com/en/support',
    freezeWindow: '24-72 hours',
    requiredDocs: ['Police report', 'Transaction hashes', 'Victim statement', 'ID verification'],
    template: (data) => `
Subject: URGENT - Stolen Crypto Freeze Request | ${data.victimAddress}

Dear Binance Security Team,

I am reporting a cryptocurrency theft and requesting an immediate freeze on stolen funds deposited to your platform.

VICTIM INFORMATION:
- Wallet Address: ${data.victimAddress}
- Date of Theft: ${new Date(data.timestamp).toLocaleDateString()}

STOLEN FUNDS:
- Amount: ${data.amount} ${data.asset}
- Chain: ${data.chainName}
- Deposit Transaction: ${data.depositTxHash}
- Deposited To (Your Platform): ${data.exchangeName}

DRAINER/ATTACKER:
- Address: ${data.drainerAddress}
- Attack Type: EIP-7702 Delegation Exploit

REQUEST:
1. Immediately freeze the account that received funds from ${data.drainerAddress}
2. Preserve all transaction records and KYC data
3. Coordinate with law enforcement for fund recovery

ATTACHED DOCUMENTS:
- Police Report
- Transaction Hash Evidence
- Victim Statement
- Government ID

This is a legitimate theft report. The funds were stolen through an EIP-7702 delegation exploit where the attacker delegated my wallet to a malicious smart contract that automatically drained incoming funds.

Please confirm receipt and freeze status.

Best regards,
[Your Name]
[Your Email]
[Your Phone]
[Police Report Number]
`
  },

  coinbase: {
    name: 'Coinbase',
    email: 'security@coinbase.com',
    supportUrl: 'https://help.coinbase.com/en/coinbase/other-topics/other/stolen-funds',
    freezeWindow: '24-48 hours',
    requiredDocs: ['Police report', 'Transaction evidence', 'ID verification'],
    template: (data) => `
Subject: URGENT - Stolen Cryptocurrency Freeze Request | Case #${data.victimAddress}

Dear Coinbase Security Team,

I am reporting stolen cryptocurrency that was deposited to a Coinbase account. I request an immediate freeze.

INCIDENT DETAILS:
- Victim Wallet: ${data.victimAddress}
- Stolen Amount: ${data.amount} ${data.asset}
- Chain: ${data.chainName}
- Theft Date: ${new Date(data.timestamp).toLocaleDateString()}

TRANSACTION EVIDENCE:
- Deposit TX Hash: ${data.depositTxHash}
- From (Drainer): ${data.drainerAddress}
- Attack Method: EIP-7702 Delegation Exploit

REQUEST:
1. Freeze the receiving account immediately
2. Preserve all records and KYC data
3. Prepare for law enforcement coordination

I have filed a police report and am willing to provide all necessary documentation.

Please confirm the freeze status.

[Your Name]
[Your Contact Info]
`
  },

  okx: {
    name: 'OKX',
    email: 'support@okx.com',
    supportUrl: 'https://www.okx.com/help-center',
    freezeWindow: '24-48 hours',
    requiredDocs: ['Police report', 'Transaction hashes', 'ID'],
    template: (data) => `
Subject: URGENT Freeze Request - Stolen Crypto | ${data.victimAddress}

Dear OKX Security,

Stolen funds were deposited to OKX. Please freeze immediately.

Victim: ${data.victimAddress}
Amount: ${data.amount} ${data.asset}
Chain: ${data.chainName}
Deposit TX: ${data.depositTxHash}
Drainer: ${data.drainerAddress}
Attack: EIP-7702 delegation exploit

I have police report and full documentation ready.

[Your Name]
`
  },

  bybit: {
    name: 'Bybit',
    email: 'support@bybit.com',
    supportUrl: 'https://www.bybit.com/en/help-center',
    freezeWindow: '24-48 hours',
    requiredDocs: ['Police report', 'Transaction evidence'],
    template: (data) => `
Subject: URGENT - Stolen Funds Freeze Request | ${data.victimAddress}

Dear Bybit Security Team,

Requesting immediate freeze on stolen crypto deposited to your platform.

Details:
- Victim: ${data.victimAddress}
- Amount: ${data.amount} ${data.asset}
- Chain: ${data.chainName}
- TX: ${data.depositTxHash}
- Drainer: ${data.drainerAddress}
- Method: EIP-7702 exploit

Police report filed. Documentation available on request.

[Your Name]
`
  },

  kraken: {
    name: 'Kraken',
    email: 'security@kraken.com',
    supportUrl: 'https://support.kraken.com',
    freezeWindow: '24-72 hours',
    requiredDocs: ['Police report', 'Transaction evidence', 'ID'],
    template: (data) => `
Subject: URGENT - Stolen Cryptocurrency Freeze Request

Dear Kraken Security,

Stolen funds deposited to Kraken. Request immediate freeze.

Victim: ${data.victimAddress}
Amount: ${data.amount} ${data.asset}
Chain: ${data.chainName}
Deposit TX: ${data.depositTxHash}
Drainer: ${data.drainerAddress}

Police report attached.

[Your Name]
`
  },

  kucoin: {
    name: 'KuCoin',
    email: 'support@kucoin.com',
    supportUrl: 'https://www.kucoin.com/support',
    freezeWindow: '24-48 hours',
    requiredDocs: ['Police report', 'Transaction evidence'],
    template: (data) => `
Subject: URGENT Freeze Request - Stolen Crypto | ${data.victimAddress}

Dear KuCoin Security,

Stolen crypto deposited to KuCoin. Please freeze account immediately.

Victim: ${data.victimAddress}
Amount: ${data.amount} ${data.asset}
TX: ${data.depositTxHash}
Drainer: ${data.drainerAddress}

Documentation ready.

[Your Name]
`
  }
}

// Generate freeze request for specific exchange
export function generateFreezeRequest(exchange: string, data: FreezeRequestData): string {
  const template = EXCHANGE_TEMPLATES[exchange.toLowerCase()]
  if (!template) {
    return `Exchange "${exchange}" template not found. Available: ${Object.keys(EXCHANGE_TEMPLATES).join(', ')}`
  }
  return template.template(data)
}

// Get all available exchanges
export function getAvailableExchanges(): { id: string; name: string; email: string; freezeWindow: string }[] {
  return Object.entries(EXCHANGE_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    email: t.email,
    freezeWindow: t.freezeWindow
  }))
}

// Generate law enforcement report
export function generateLawEnforcementReport(data: FreezeRequestData): string {
  return `
CRYPTOCURRENCY THEFT REPORT
============================

INCIDENT SUMMARY:
- Type: Cryptocurrency Theft via EIP-7702 Delegation Exploit
- Date: ${new Date(data.timestamp).toLocaleDateString()}
- Time: ${new Date(data.timestamp).toLocaleTimeString()}

VICTIM INFORMATION:
- Wallet Address: ${data.victimAddress}
- Blockchain: ${data.chainName}

STOLEN FUNDS:
- Amount: ${data.amount} ${data.asset}
- Current Location: ${data.exchangeName || 'Unknown'}

ATTACKER INFORMATION:
- Drainer Address: ${data.drainerAddress}
- Attack Vector: EIP-7702 wallet delegation to malicious smart contract
- Method: Automated bot draining incoming funds every ~12 seconds

TECHNICAL EXPLANATION:
The attacker exploited EIP-7702 (a new Ethereum feature allowing EOA wallets to delegate execution to smart contracts). The victim's wallet was delegated to a malicious contract that automatically transfers any incoming funds to the attacker's address. This is an automated attack - the drainer bot monitors the compromised wallet and drains funds within seconds of arrival.

TRANSACTION EVIDENCE:
- Theft TX: ${data.depositTxHash}
- Drainer Contract: ${data.drainerAddress}

REQUESTED ACTION:
1. Investigate the drainer address for connected identities
2. Coordinate with ${data.exchangeName || 'exchanges'} to freeze stolen funds
3. Pursue criminal charges against the attacker

SUPPORTING DOCUMENTS:
- Blockchain transaction records
- Wallet address analysis
- Exchange deposit evidence

This report is filed under penalty of perjury.

[Your Name]
[Date]
`
}
