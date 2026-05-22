// Hardware Wallet Support — Ledger & Trezor via WebUSB/WebHID
// Used for the SAFE wallet (not the compromised wallet)

export interface HardwareWalletInfo {
  address: string
  derivationPath: string
  deviceType: 'ledger' | 'trezor'
  transport: unknown // WebHID or WebUSB transport instance
}

export interface SignedTransaction {
  rawTransaction: string
  hash: string
}

// Standard derivation paths
const DERIVATION_PATHS = {
  ledger: "m/44'/60'/0'/0/0",
  trezor: "m/44'/60'/0'/0/0",
} as const

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
 * Connect a Ledger hardware wallet via WebHID
 * Returns the first derived address and transport reference
 */
export async function connectLedger(): Promise<HardwareWalletInfo> {
  if (!isWebHIDSupported()) {
    throw new Error('WebHID is not supported in this browser. Please use Chrome or Edge.')
  }

  try {
    // Dynamically import to avoid SSR issues
    const TransportWebHID = (await import('@ledgerhq/hw-transport-webhid')).default
    const Eth = (await import('@ledgerhq/hw-app-eth')).default

    const transport = await TransportWebHID.create()
    const eth = new Eth(transport)

    const result = await eth.getAddress(DERIVATION_PATHS.ledger, false)

    return {
      address: result.address,
      derivationPath: DERIVATION_PATHS.ledger,
      deviceType: 'ledger',
      transport,
    }
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
 * Returns the first derived address and transport reference
 */
export async function connectTrezor(): Promise<HardwareWalletInfo> {
  try {
    // Dynamically import Trezor Connect
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
    return {
      address: payload.address,
      derivationPath: DERIVATION_PATHS.trezor,
      deviceType: 'trezor',
      transport: TrezorConnect,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to connect Trezor: ${message}`)
  }
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
    const sig = await eth.signTransaction(path, unsignedTx.slice(2)) // remove 0x prefix

    // Reconstruct signed transaction
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
    if (wallet.deviceType === 'ledger' && wallet.transport) {
      const transport = wallet.transport as { close: () => Promise<void> }
      await transport.close()
    }
    // Trezor Connect doesn't need explicit disconnection
  } catch {
    // Silent cleanup
  }
}
