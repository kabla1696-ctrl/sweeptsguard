// Hardware Wallet Support — Ledger & Trezor via WebUSB/WebHID
// Air-gapped signing, multi-device management, firmware info, security guide

export interface HardwareWalletInfo {
  address: string
  derivationPath: string
  deviceType: 'ledger' | 'trezor' | 'keystone' | 'airgap'
  transport: unknown // WebHID or WebUSB transport instance
  deviceId?: string
  firmwareVersion?: string
  model?: string
  label?: string
  connectedAt: number
}

export interface SignedTransaction {
  rawTransaction: string
  hash: string
}

export interface DeviceStatus {
  connected: boolean
  deviceType: HardwareWalletInfo['deviceType']
  model: string
  firmwareVersion: string
  firmwareUpToDate: boolean
  batteryLevel?: number
  isUnlocked: boolean
  appOpen?: string
  lastSeen: number
}

export interface AirGapPayload {
  unsignedTx: string
  chainId: number
  metadata: {
    to: string
    value: string
    gasLimit: string
    nonce: number
  }
}

export interface AirGapSignedPayload {
  signature: string
  address: string
  hash: string
}

export interface SecurityGuideItem {
  title: string
  icon: string
  severity: 'critical' | 'important' | 'recommended'
  description: string
  steps: string[]
}

// Standard derivation paths
const DERIVATION_PATHS = {
  ledger: "m/44'/60'/0'/0/0",
  trezor: "m/44'/60'/0'/0/0",
  keystone: "m/44'/60'/0'/0/0",
  airgap: "m/44'/60'/0'/0/0",
} as const

// Known firmware versions for device models
const FIRMWARE_VERSIONS: Record<string, { latest: string; minimum: string }> = {
  'ledger-nano-s': { latest: '2.1.0', minimum: '2.0.0' },
  'ledger-nano-x': { latest: '2.2.3', minimum: '2.1.0' },
  'ledger-nano-s-plus': { latest: '1.1.1', minimum: '1.0.4' },
  'ledger-stax': { latest: '1.4.0', minimum: '1.2.0' },
  'trezor-one': { latest: '1.12.2', minimum: '1.11.2' },
  'trezor-model-t': { latest: '2.6.3', minimum: '2.5.3' },
  'trezor-safe-3': { latest: '2.6.3', minimum: '2.5.3' },
  'trezor-safe-5': { latest: '2.8.1', minimum: '2.7.0' },
  'keystone-3-pro': { latest: '1.3.0', minimum: '1.1.0' },
}

// Multi-device manager state
const connectedDevices = new Map<string, HardwareWalletInfo>()

/**
 * Check if WebHID is available (Ledger)
 */
export function isWebHIDSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'hid' in navigator
}

/**
 * Check if WebUSB is available (Trezor)
 */
export function isWebUSBSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'usb' in navigator
}

/**
 * Check if camera is available (for QR-based air-gapped signing)
 */
export function isCameraSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
}

/**
 * Connect a Ledger hardware wallet via WebHID
 */
export async function connectLedger(): Promise<HardwareWalletInfo> {
  if (!isWebHIDSupported()) {
    throw new Error('WebHID is not supported in this browser. Please use Chrome or Edge.')
  }

  try {
    const TransportWebHID = (await import('@ledgerhq/hw-transport-webhid')).default
    const Eth = (await import('@ledgerhq/hw-app-eth')).default

    const transport = await TransportWebHID.create()
    const eth = new Eth(transport)

    const result = await eth.getAddress(DERIVATION_PATHS.ledger, false)
    const deviceId = `ledger-${result.address.slice(2, 10)}`
    const model = await detectLedgerModel(transport)
    const firmware = await getLedgerFirmware(eth)

    const wallet: HardwareWalletInfo = {
      address: result.address,
      derivationPath: DERIVATION_PATHS.ledger,
      deviceType: 'ledger',
      transport,
      deviceId,
      firmwareVersion: firmware,
      model,
      connectedAt: Date.now(),
    }

    connectedDevices.set(deviceId, wallet)
    return wallet
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('No device selected') || message.includes('cancelled')) {
      throw new Error('Device selection was cancelled. Please try again.')
    }
    throw new Error(`Failed to connect Ledger: ${message}`)
  }
}

/**
 * Connect a Trezor hardware wallet via Trezor Connect
 */
export async function connectTrezor(): Promise<HardwareWalletInfo> {
  try {
    const TrezorConnect = (await import('@trezor/connect-web')).default

    TrezorConnect.init({
      lazyLoad: true,
      manifest: {
        email: 'support@sweeptsguard.xyz',
        appUrl: 'https://sweeptsguard.xyz',
      },
    })

    const result = await TrezorConnect.ethereumGetAddress({
      path: DERIVATION_PATHS.trezor,
      showOnTrezor: false,
    })

    if (!result.success) {
      throw new Error((result.payload as { error: string }).error)
    }

    const payload = result.payload as { address: string }
    const deviceId = `trezor-${payload.address.slice(2, 10)}`

    const wallet: HardwareWalletInfo = {
      address: payload.address,
      derivationPath: DERIVATION_PATHS.trezor,
      deviceType: 'trezor',
      transport: TrezorConnect,
      deviceId,
      model: 'Trezor',
      connectedAt: Date.now(),
    }

    connectedDevices.set(deviceId, wallet)
    return wallet
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to connect Trezor: ${message}`)
  }
}

/**
 * Connect Keystone hardware wallet via QR air-gap
 */
export async function connectKeystone(): Promise<HardwareWalletInfo> {
  // Keystone uses QR code exchange — we simulate the initial connection
  // In production, this would scan a QR code from the Keystone device
  const wallet: HardwareWalletInfo = {
    address: '',
    derivationPath: DERIVATION_PATHS.keystone,
    deviceType: 'keystone',
    transport: null,
    model: 'Keystone 3 Pro',
    firmwareVersion: '1.3.0',
    connectedAt: Date.now(),
  }
  return wallet
}

/**
 * Detect Ledger model from transport
 */
async function detectLedgerModel(transport: unknown): Promise<string> {
  try {
    const t = transport as { deviceModel?: { productName?: string } }
    if (t.deviceModel?.productName) return t.deviceModel.productName
  } catch { /* ignore */ }
  return 'Ledger'
}

/**
 * Get Ledger firmware version
 */
async function getLedgerFirmware(eth: unknown): Promise<string> {
  try {
    const e = eth as { getAppConfiguration: () => Promise<{ version: string }> }
    const config = await e.getAppConfiguration()
    return config.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Get device status and firmware info
 */
export async function getDeviceStatus(wallet: HardwareWalletInfo): Promise<DeviceStatus> {
  const firmwareInfo = FIRMWARE_VERSIONS[wallet.model?.toLowerCase().replace(/\s+/g, '-') || '']
  const firmwareUpToDate = firmwareInfo
    ? compareVersions(wallet.firmwareVersion || '0', firmwareInfo.latest) >= 0
    : true

  const status: DeviceStatus = {
    connected: connectedDevices.has(wallet.deviceId || ''),
    deviceType: wallet.deviceType,
    model: wallet.model || wallet.deviceType,
    firmwareVersion: wallet.firmwareVersion || 'unknown',
    firmwareUpToDate,
    isUnlocked: true, // Detected during connection
    lastSeen: wallet.connectedAt,
  }

  // Get battery for Ledger Nano X / Stax
  if (wallet.deviceType === 'ledger' && wallet.transport) {
    try {
      const Eth = (await import('@ledgerhq/hw-app-eth')).default
      const eth = new Eth(wallet.transport as import('@ledgerhq/hw-transport').default)
      const config = await (eth as { getAppConfiguration?: () => Promise<{ batteryLevel?: number }> }).getAppConfiguration?.()
      if (config?.batteryLevel !== undefined) {
        status.batteryLevel = config.batteryLevel
      }
    } catch { /* not available */ }
  }

  return status
}

/**
 * Get all connected devices
 */
export function getConnectedDevices(): HardwareWalletInfo[] {
  return Array.from(connectedDevices.values())
}

/**
 * Remove a device from the manager
 */
export function removeDevice(deviceId: string): boolean {
  return connectedDevices.delete(deviceId)
}

/**
 * Set a custom label for a device
 */
export function labelDevice(deviceId: string, label: string): boolean {
  const device = connectedDevices.get(deviceId)
  if (device) {
    device.label = label
    connectedDevices.set(deviceId, device)
    return true
  }
  return false
}

/**
 * Sign a transaction with a Ledger device
 */
export async function signWithLedger(
  transport: unknown,
  unsignedTx: string,
  derivationPath?: string
): Promise<SignedTransaction> {
  try {
    const Eth = (await import('@ledgerhq/hw-app-eth')).default
    const eth = new Eth(transport as import('@ledgerhq/hw-transport').default)

    const path = derivationPath || DERIVATION_PATHS.ledger
    const sig = await eth.signTransaction(path, unsignedTx.slice(2))

    const { ethers } = await import('ethers')
    const tx = ethers.Transaction.from(`0x${unsignedTx}`)
    tx.signature = ethers.Signature.from({
      r: `0x${sig.r}`,
      s: `0x${sig.s}`,
      v: parseInt(sig.v, 16),
    })

    return {
      rawTransaction: tx.serialized,
      hash: tx.hash || '',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Ledger signing failed: ${message}`)
  }
}

/**
 * Sign a transaction with a Trezor device
 */
export async function signWithTrezor(
  transport: unknown,
  unsignedTx: string,
  chainId: number,
  derivationPath?: string
): Promise<SignedTransaction> {
  try {
    const TrezorConnect = (await import('@trezor/connect-web')).default
    const { ethers } = await import('ethers')

    const path = derivationPath || DERIVATION_PATHS.trezor
    const tx = ethers.Transaction.from(unsignedTx)

    const result = await TrezorConnect.ethereumSignTransaction({
      path,
      transaction: {
        to: tx.to || '',
        value: tx.value.toString(),
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || tx.maxFeePerGas?.toString() || '0',
        nonce: tx.nonce.toString(),
        data: tx.data,
        chainId,
      },
    })

    if (!result.success) {
      throw new Error((result.payload as { error: string }).error)
    }

    const sig = result.payload as { r: string; s: string; v: string }
    tx.signature = ethers.Signature.from({
      r: sig.r,
      s: sig.s,
      v: parseInt(sig.v, 16),
    })

    return {
      rawTransaction: tx.serialized,
      hash: tx.hash || '',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Trezor signing failed: ${message}`)
  }
}

/**
 * Generate QR code payload for air-gapped signing
 */
export function generateAirGapPayload(
  unsignedTx: string,
  chainId: number,
  metadata: AirGapPayload['metadata']
): string {
  const payload: AirGapPayload = { unsignedTx, chainId, metadata }
  // Encode as base64 for QR code generation
  return btoa(JSON.stringify(payload))
}

/**
 * Parse a scanned QR code payload (signed transaction)
 */
export function parseAirGapSignedPayload(qrData: string): AirGapSignedPayload {
  try {
    const decoded = atob(qrData)
    const parsed = JSON.parse(decoded) as AirGapSignedPayload
    if (!parsed.signature || !parsed.address) {
      throw new Error('Invalid air-gap payload: missing signature or address')
    }
    return parsed
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to parse air-gap payload: ${message}`)
  }
}

/**
 * Generic sign function — dispatches to correct device
 */
export async function signWithHardware(
  wallet: HardwareWalletInfo,
  unsignedTx: string,
  chainId?: number
): Promise<SignedTransaction> {
  if (wallet.deviceType === 'ledger') {
    return signWithLedger(wallet.transport, unsignedTx, wallet.derivationPath)
  } else if (wallet.deviceType === 'trezor') {
    if (!chainId) throw new Error('chainId required for Trezor signing')
    return signWithTrezor(wallet.transport, unsignedTx, chainId, wallet.derivationPath)
  }

  throw new Error(`Unsupported device type: ${wallet.deviceType}`)
}

/**
 * Disconnect a hardware wallet (cleanup transport)
 */
export async function disconnectHardware(wallet: HardwareWalletInfo): Promise<void> {
  try {
    if (wallet.deviceId) {
      connectedDevices.delete(wallet.deviceId)
    }
    if (wallet.deviceType === 'ledger' && wallet.transport) {
      const transport = wallet.transport as { close: () => Promise<void> }
      await transport.close()
    }
  } catch {
    // Silent cleanup
  }
}

/**
 * Compare semantic versions (returns -1, 0, 1)
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * Hardware wallet security best practices
 */
export function getSecurityGuide(): SecurityGuideItem[] {
  return [
    {
      title: 'Always verify addresses on device',
      icon: '🔍',
      severity: 'critical',
      description: 'Never trust addresses shown on your computer screen. Always confirm the full address on your hardware wallet\'s display before signing.',
      steps: [
        'Check every character of the address on the device screen',
        'Compare at least the first and last 6 characters',
        'Beware of clipboard malware that swaps addresses',
        'Use address whitelisting when available',
      ],
    },
    {
      title: 'Keep firmware up to date',
      icon: '🔄',
      severity: 'critical',
      description: 'Firmware updates patch security vulnerabilities. Running outdated firmware puts your funds at risk.',
      steps: [
        'Check for firmware updates monthly',
        'Only update from official sources (ledger.com, trezor.io)',
        'Never install firmware from third-party links',
        'Verify firmware signatures before installing',
      ],
    },
    {
      title: 'Never share your seed phrase',
      icon: '🚫',
      severity: 'critical',
      description: 'Your 24-word recovery phrase is the master key to all your funds. No legitimate service will ever ask for it.',
      steps: [
        'Store seed phrase offline (metal backup recommended)',
        'Never type it into any website or app',
        'Never photograph or screenshot it',
        'Consider splitting it with Shamir\'s Secret Sharing',
      ],
    },
    {
      title: 'Use a dedicated device for signing',
      icon: '💻',
      severity: 'important',
      description: 'If possible, use a clean computer for hardware wallet interactions to reduce the attack surface.',
      steps: [
        'Use a dedicated machine or live USB for signing',
        'Keep the signing device offline when not in use',
        'Don\'t install unnecessary software on the signing device',
        'Consider using Tails OS for air-gapped signing',
      ],
    },
    {
      title: 'Enable passphrase (25th word)',
      icon: '🔐',
      severity: 'important',
      description: 'A passphrase adds an extra layer of security. Even if someone steals your seed, they need the passphrase too.',
      steps: [
        'Set a strong, unique passphrase',
        'Store the passphrase separately from your seed phrase',
        'Practice recovering with the passphrase before storing large amounts',
        'Use different passphrases for different purposes',
      ],
    },
    {
      title: 'Review transaction details carefully',
      icon: '📋',
      severity: 'important',
      description: 'Blind signing (signing without seeing details) is dangerous. Always review what you\'re signing.',
      steps: [
        'Enable "Blind signing" only when absolutely necessary',
        'Review the recipient address on the device',
        'Verify the amount and gas fees',
        'Be suspicious of requests to sign unfamiliar data',
      ],
    },
    {
      title: 'Use air-gapped signing for large amounts',
      icon: '📱',
      severity: 'recommended',
      description: 'For high-value transactions, use QR-based air-gapped signing to eliminate any network attack vector.',
      steps: [
        'Generate unsigned transaction QR on online device',
        'Scan with air-gapped hardware wallet',
        'Scan signed response QR back to online device',
        'Broadcast the signed transaction',
      ],
    },
    {
      title: 'Test with small amounts first',
      icon: '🧪',
      severity: 'recommended',
      description: 'Before moving large amounts, always send a small test transaction to verify the setup works correctly.',
      steps: [
        'Send a minimal amount to the new address',
        'Verify receipt on the receiving end',
        'Test the full recovery process with the small amount',
        'Only then move larger amounts',
      ],
    },
  ]
}

/**
 * Get supported devices list
 */
export function getSupportedDevices() {
  return [
    { id: 'ledger-nano-s', name: 'Ledger Nano S', type: 'ledger' as const, connection: 'USB', icon: '🔵' },
    { id: 'ledger-nano-s-plus', name: 'Ledger Nano S Plus', type: 'ledger' as const, connection: 'USB', icon: '🔵' },
    { id: 'ledger-nano-x', name: 'Ledger Nano X', type: 'ledger' as const, connection: 'USB/Bluetooth', icon: '🔵' },
    { id: 'ledger-stax', name: 'Ledger Stax', type: 'ledger' as const, connection: 'USB/Bluetooth', icon: '🔵' },
    { id: 'trezor-one', name: 'Trezor Model One', type: 'trezor' as const, connection: 'USB', icon: '🟢' },
    { id: 'trezor-model-t', name: 'Trezor Model T', type: 'trezor' as const, connection: 'USB', icon: '🟢' },
    { id: 'trezor-safe-3', name: 'Trezor Safe 3', type: 'trezor' as const, connection: 'USB', icon: '🟢' },
    { id: 'trezor-safe-5', name: 'Trezor Safe 5', type: 'trezor' as const, connection: 'USB/Touch', icon: '🟢' },
    { id: 'keystone-3-pro', name: 'Keystone 3 Pro', type: 'keystone' as const, connection: 'QR (Air-Gap)', icon: '🟠' },
  ]
}
