// Telegram Bot Alert System
const TELEGRAM_API = 'https://api.telegram.org/bot'

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface AlertMessage {
  type: 'balance_change' | 'incoming_transfer' | 'sweep_success' | 'sweep_failed' | 'drainer_detected' | 'exchange_deposit'
  title: string
  message: string
  chainName?: string
  amount?: string
  asset?: string
  txHash?: string
  explorerUrl?: string
}

export class TelegramAlert {
  private config: TelegramConfig

  constructor(config: TelegramConfig) {
    this.config = config
  }

  private getEmoji(type: AlertMessage['type']): string {
    const emojis: Record<string, string> = {
      balance_change: '💰',
      incoming_transfer: '📥',
      sweep_success: '✅',
      sweep_failed: '❌',
      drainer_detected: '🚨',
      exchange_deposit: '🏦'
    }
    return emojis[type] || '📢'
  }

  private formatMessage(alert: AlertMessage): string {
    const emoji = this.getEmoji(alert.type)
    let text = `${emoji} *${alert.title}*\n\n${alert.message}`

    if (alert.chainName) text += `\n\n⛓️ Chain: ${alert.chainName}`
    if (alert.amount) text += `\n💰 Amount: ${alert.amount} ${alert.asset || ''}`
    if (alert.txHash) text += `\n📝 Tx: \`${alert.txHash}\``
    if (alert.explorerUrl) text += `\n🔗 [View on Explorer](${alert.explorerUrl})`

    text += `\n\n⏰ ${new Date().toISOString()}`
    return text
  }

  async send(alert: AlertMessage): Promise<boolean> {
    try {
      const text = this.formatMessage(alert)
      const url = `${TELEGRAM_API}${this.config.botToken}/sendMessage`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      })

      const data = await response.json()
      return data.ok === true
    } catch {
      return false
    }
  }

  // Send sweep success alert
  async sendSweepSuccess(chainName: string, asset: string, amount: string, txHash: string, explorerUrl: string): Promise<boolean> {
    return this.send({
      type: 'sweep_success',
      title: 'FUNDS SWEPT TO SAFETY',
      message: `Successfully swept funds to your safe wallet!`,
      chainName,
      amount,
      asset,
      txHash,
      explorerUrl
    })
  }

  // Send incoming transfer alert
  async sendIncomingTransfer(chainName: string, asset: string, amount: string): Promise<boolean> {
    return this.send({
      type: 'incoming_transfer',
      title: 'INCOMING FUNDS DETECTED',
      message: `New funds detected on compromised wallet!`,
      chainName,
      amount,
      asset
    })
  }

  // Send drainer detected alert
  async sendDrainerDetected(drainerName: string, address: string): Promise<boolean> {
    return this.send({
      type: 'drainer_detected',
      title: 'KNOWN DRAINER DETECTED',
      message: `Wallet delegation points to known drainer!\n\nDrainer: ${drainerName}\nAddress: \`${address}\``,
    })
  }

  // Send exchange deposit alert
  async sendExchangeDeposit(exchangeName: string, amount: string, asset: string, txHash: string): Promise<boolean> {
    return this.send({
      type: 'exchange_deposit',
      title: 'FUNDS DEPOSITED TO EXCHANGE',
      message: `Stolen funds deposited to ${exchangeName}! Consider filing a freeze request.`,
      amount,
      asset,
      txHash
    })
  }

  // Send sweep failed alert
  async sendSweepFailed(chainName: string, asset: string, error: string): Promise<boolean> {
    return this.send({
      type: 'sweep_failed',
      title: 'SWEEP FAILED',
      message: `Failed to sweep funds! Manual action required.\n\nError: ${error}`,
      chainName,
      asset
    })
  }
}

export function createTelegramAlert(botToken: string, chatId: string): TelegramAlert {
  return new TelegramAlert({ botToken, chatId })
}
