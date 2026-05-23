// Type declarations for optional hardware wallet dependencies
// These are dynamically imported at runtime

declare module '@ledgerhq/hw-transport-webhid' {
  import Transport from '@ledgerhq/hw-transport'
  export default class TransportWebHID extends Transport {
    static create(): Promise<TransportWebHID>
  }
}

declare module '@ledgerhq/hw-app-eth' {
  import Transport from '@ledgerhq/hw-transport'
  export default class Eth {
    constructor(transport: Transport)
    getAddress(
      path: string,
      boolDisplay?: boolean,
      boolChaincode?: boolean
    ): Promise<{ address: string; publicKey: string; chainCode: string }>
    signTransaction(
      path: string,
      rawTxHex: string
    ): Promise<{ s: string; r: string; v: string }>
  }
}

declare module '@ledgerhq/hw-transport' {
  export default class Transport {
    close(): Promise<void>
  }
}

declare module '@trezor/connect-web' {
  interface TrezorConnectManifest {
    email: string
    appUrl: string
  }

  interface TrezorConnectInitParams {
    lazyLoad?: boolean
    manifest: TrezorConnectManifest
  }

  interface EthereumGetAddressParams {
    path: string
    showOnTrezor?: boolean
  }

  interface EthereumGetAddressResult {
    success: boolean
    payload: { address: string } | { error: string }
  }

  interface EthereumSignTransactionParams {
    path: string
    transaction: {
      to: string
      value: string
      gasLimit: string
      gasPrice: string
      nonce: string
      data: string
      chainId: number
    }
  }

  interface EthereumSignTransactionResult {
    success: boolean
    payload: { r: string; s: string; v: string } | { error: string }
  }

  const TrezorConnect: {
    init(params: TrezorConnectInitParams): void
    ethereumGetAddress(params: EthereumGetAddressParams): Promise<EthereumGetAddressResult>
    ethereumSignTransaction(params: EthereumSignTransactionParams): Promise<EthereumSignTransactionResult>
  }

  export default TrezorConnect
}
