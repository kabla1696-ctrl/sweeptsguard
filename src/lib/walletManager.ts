// Multi-Wallet Manager - localStorage based
export interface ManagedWallet {
  id: string
  address: string
  safeAddress?: string
  label: string
  chainIds: number[]
  isActive: boolean
  addedAt: number
  notes?: string
}

const STORAGE_KEY = 'sweeptsguard_wallets'

export class WalletManager {
  private wallets: ManagedWallet[] = []

  constructor() {
    this.load()
  }

  private load(): void {
    if (typeof window === 'undefined') return
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        this.wallets = JSON.parse(data) as ManagedWallet[]
      }
    } catch {
      this.wallets = []
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.wallets))
    } catch {
      // Storage full or unavailable
    }
  }

  getAll(): ManagedWallet[] {
    return [...this.wallets]
  }

  getById(id: string): ManagedWallet | undefined {
    return this.wallets.find(w => w.id === id)
  }

  add(wallet: Omit<ManagedWallet, 'id' | 'addedAt'>): ManagedWallet {
    const newWallet: ManagedWallet = {
      ...wallet,
      id: crypto.randomUUID(),
      addedAt: Date.now()
    }
    this.wallets.push(newWallet)
    this.save()
    return newWallet
  }

  update(id: string, updates: Partial<Omit<ManagedWallet, 'id' | 'addedAt'>>): ManagedWallet | null {
    const index = this.wallets.findIndex(w => w.id === id)
    if (index === -1) return null
    this.wallets[index] = { ...this.wallets[index], ...updates }
    this.save()
    return this.wallets[index]
  }

  remove(id: string): boolean {
    const index = this.wallets.findIndex(w => w.id === id)
    if (index === -1) return false
    this.wallets.splice(index, 1)
    this.save()
    return true
  }

  setActive(id: string): void {
    this.wallets.forEach(w => {
      w.isActive = w.id === id
    })
    this.save()
  }

  getActive(): ManagedWallet | undefined {
    return this.wallets.find(w => w.isActive)
  }
}

export function createWalletManager(): WalletManager {
  return new WalletManager()
}
