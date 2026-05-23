// Multi-Channel Alert System (Telegram, Discord, Slack)
const TELEGRAM_API = 'https://api.telegram.org/bot'

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

export interface AlertConfig {
  telegramBotToken?: string
  telegramChatId?: string
  discordWebhookUrl?: string
  slackWebhookUrl?: string
}

export class AlertSystem {
  private config: AlertConfig

  constructor(config: AlertConfig) {
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

  private formatMarkdown(alert: AlertMessage): string {
    const emoji = this.getEmoji(alert.type)
    let text = `${emoji} *${alert.title}*\n\n${alert.message}`
    if (alert.chainName) text += `\n\n⛓️ Chain: ${alert.chainName}`
    if (alert.amount) text += `\n💰 Amount: ${alert.amount} ${alert.asset || ''}`
    if (alert.txHash) text += `\n📝 Tx: \`${alert.txHash}\``
    if (alert.explorerUrl) text += `\n🔗 [View on Explorer](${alert.explorerUrl})`
    text += `\n\n⏰ ${new Date().toISOString()}`
    return text
  }

  private formatDiscord(alert: AlertMessage): string {
    const emoji = this.getEmoji(alert.type)
    let text = `${emoji} **${alert.title}**\n\n${alert.message}`
    if (alert.chainName) text += `\n\n⛓️ Chain: ${alert.chainName}`
    if (alert.amount) text += `\n💰 Amount: ${alert.amount} ${alert.asset || ''}`
    if (alert.txHash) text += `\n📝 Tx: \`${alert.txHash}\``
    if (alert.explorerUrl) text += `\n🔗 [View on Explorer](${alert.explorerUrl})`
    text += `\n\n⏰ ${new Date().toISOString()}`
    return text
  }

  private formatSlack(alert: AlertMessage): string {
    const emoji = this.getEmoji(alert.type)
    let text = `${emoji} *${alert.title}*\n\n${alert.message}`
    if (alert.chainName) text += `\n\n⛓️ Chain: ${alert.chainName}`
    if (alert.amount) text += `\n💰 Amount: ${alert.amount} ${alert.asset || ''}`
    if (alert.txHash) text += `\n📝 Tx: ${alert.txHash}`
    if (alert.explorerUrl) text += `\n🔗 <${alert.explorerUrl}|View on Explorer>`
    text += `\n\n⏰ ${new Date().toISOString()}`
    return text
  }

  async sendTelegram(alert: AlertMessage): Promise<boolean> {
    if (!this.config.telegramBotToken || !this.config.telegramChatId) return false
    try {
      const text = this.formatMarkdown(alert)
      const url = `${TELEGRAM_API}${this.config.telegramBotToken}/sendMessage`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      })
      const data = await response.json() as { ok?: boolean }
      return data.ok === true
    } catch {
      return false
    }
  }

  async sendDiscord(alert: AlertMessage): Promise<boolean> {
    if (!this.config.discordWebhookUrl) return false
    try {
      const content = this.formatDiscord(alert)
      const response = await fetch(this.config.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      return response.ok
    } catch {
      return false
    }
  }

  async sendSlack(alert: AlertMessage): Promise<boolean> {
    if (!this.config.slackWebhookUrl) return false
    try {
      const text = this.formatSlack(alert)
      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      return response.ok
    } catch {
      return false
    }
  }

  async send(alert: AlertMessage): Promise<{ telegram: boolean; discord: boolean; slack: boolean }> {
    const [telegram, discord, slack] = await Promise.all([
      this.sendTelegram(alert),
      this.sendDiscord(alert),
      this.sendSlack(alert)
    ])
    return { telegram, discord, slack }
  }

  async sendSweepSuccess(chainName: string, asset: string, amount: string, txHash: string, explorerUrl: string): Promise<void> {
    await this.send({
      type: 'sweep_success',
      title: 'FUNDS SWEPT TO SAFETY',
      message: 'Successfully swept funds to your safe wallet!',
      chainName, amount, asset, txHash, explorerUrl
    })
  }

  async sendIncomingTransfer(chainName: string, asset: string, amount: string): Promise<void> {
    await this.send({
      type: 'incoming_transfer',
      title: 'INCOMING FUNDS DETECTED',
      message: 'New funds detected on compromised wallet!',
      chainName, amount, asset
    })
  }

  async sendDrainerDetected(drainerName: string, address: string): Promise<void> {
    await this.send({
      type: 'drainer_detected',
      title: 'KNOWN DRAINER DETECTED',
      message: `Wallet delegation points to known drainer!\n\nDrainer: ${drainerName}\nAddress: \`${address}\``
    })
  }

  async sendExchangeDeposit(exchangeName: string, amount: string, asset: string, txHash: string): Promise<void> {
    await this.send({
      type: 'exchange_deposit',
      title: 'FUNDS DEPOSITED TO EXCHANGE',
      message: `Stolen funds deposited to ${exchangeName}! Consider filing a freeze request.`,
      amount, asset, txHash
    })
  }

  async sendSweepFailed(chainName: string, asset: string, error: string): Promise<void> {
    await this.send({
      type: 'sweep_failed',
      title: 'SWEEP FAILED',
      message: `Failed to sweep funds! Manual action required.\n\nError: ${error}`,
      chainName, asset
    })
  }
}

// Backward-compatible Telegram-only wrapper
export interface TelegramConfig {
  botToken: string
  chatId: string
}

export class TelegramAlert {
  private system: AlertSystem

  constructor(config: TelegramConfig) {
    this.system = new AlertSystem({
      telegramBotToken: config.botToken,
      telegramChatId: config.chatId
    })
  }

  async send(alert: AlertMessage): Promise<boolean> {
    return this.system.sendTelegram(alert)
  }

  async sendSweepSuccess(chainName: string, asset: string, amount: string, txHash: string, explorerUrl: string): Promise<boolean> {
    return this.system.sendTelegram({
      type: 'sweep_success', title: 'FUNDS SWEPT TO SAFETY',
      message: 'Successfully swept funds to your safe wallet!',
      chainName, amount, asset, txHash, explorerUrl
    })
  }

  async sendIncomingTransfer(chainName: string, asset: string, amount: string): Promise<boolean> {
    return this.system.sendTelegram({
      type: 'incoming_transfer', title: 'INCOMING FUNDS DETECTED',
      message: 'New funds detected on compromised wallet!',
      chainName, amount, asset
    })
  }

  async sendDrainerDetected(drainerName: string, address: string): Promise<boolean> {
    return this.system.sendTelegram({
      type: 'drainer_detected', title: 'KNOWN DRAINER DETECTED',
      message: `Wallet delegation points to known drainer!\n\nDrainer: ${drainerName}\nAddress: \`${address}\``
    })
  }

  async sendExchangeDeposit(exchangeName: string, amount: string, asset: string, txHash: string): Promise<boolean> {
    return this.system.sendTelegram({
      type: 'exchange_deposit', title: 'FUNDS DEPOSITED TO EXCHANGE',
      message: `Stolen funds deposited to ${exchangeName}! Consider filing a freeze request.`,
      amount, asset, txHash
    })
  }

  async sendSweepFailed(chainName: string, asset: string, error: string): Promise<boolean> {
    return this.system.sendTelegram({
      type: 'sweep_failed', title: 'SWEEP FAILED',
      message: `Failed to sweep funds! Manual action required.\n\nError: ${error}`,
      chainName, asset
    })
  }
}

export function createTelegramAlert(botToken: string, chatId: string): TelegramAlert {
  return new TelegramAlert({ botToken, chatId })
}

export function createAlertSystem(config: AlertConfig): AlertSystem {
  return new AlertSystem(config)
}
