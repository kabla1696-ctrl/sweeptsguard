# SweepGuard Test Airdrop

## 🧪 Test the Claim Functionality

### Quick Test (No Deployment)

1. **Open test page:**
   ```bash
   cd sweeptsguard
   npx serve . -l 3000
   # Open http://localhost:3000/test-airdrop.html
   ```

2. **Connect MetaMask** (switch to Sepolia testnet)

3. **Get testnet ETH** from faucets:
   - https://sepoliafaucet.com/
   - https://faucets.chain.link/sepolia
   - https://www.alchemy.com/faucets/ethereum-sepolia

4. **Click "Claim"** — tests the extension integration

---

## 🚀 Real Test (Deploy Contracts)

### Step 1: Get Sepolia ETH
- Visit https://sepoliafaucet.com/
- Request 0.5 Sepolia ETH

### Step 2: Create Test Wallet
```bash
node scripts/get-test-wallet.js
```

### Step 3: Deploy Contracts
```bash
# Set your private key (testnet only!)
export DEPLOYER_KEY="your_testnet_private_key"

# Deploy
npx hardhat run scripts/deploy-test-airdrop.js --network sepolia
```

### Step 4: Test Claim
1. Open `test-airdrop.html` in browser
2. Connect MetaMask to Sepolia
3. Click "Claim 100 SGTT Tokens"
4. Approve transaction
5. Check wallet for SGTT tokens!

---

## 📋 Contract Methods

### Test Token (SGTT)
- `mint(address, amount)` — Mint tokens (anyone can call for testing)
- `balanceOf(address)` — Check balance
- `transfer(address, amount)` — Transfer tokens

### Airdrop Contract
- `claimSimple()` — Claim tokens (no proof needed)
- `claimTo(address)` — Claim to specific address
- `claimed(address)` — Check if address claimed
- `balance()` — Check airdrop contract balance

---

## 🔧 Extension Testing

1. **Load extension** in Chrome
2. **Navigate** to `http://localhost:3000/test-airdrop.html`
3. **Extension should detect** claim page
4. **Click extension icon** — popup opens
5. **Enter wallets:**
   - Compromised wallet: Your test wallet private key
   - Safe wallet: Another wallet address
   - Sponsor wallet: Wallet with Sepolia ETH
6. **Select chain:** Sepolia (11155111)
7. **Click "Claim"** — tests full flow!

---

## 📝 Notes

- **Testnet only** — No real value
- **Sepolia chain ID:** 11155111
- **SGTT token** — SweepGuard Test Token
- **100 SGTT** per claim
- **10,000 SGTT** funded in airdrop contract

---

## 🎯 What to Test

- [ ] Extension detects claim page
- [ ] Wallet connection works
- [ ] Claim transaction succeeds
- [ ] 80/20 split works (if FeeCollector deployed)
- [ ] Gas estimation is accurate
- [ ] Network fee selector works
- [ ] Stealth mode works
- [ ] Transaction shows in history

---

## 🆘 Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucets

### "Transaction failed"
- Check you're on Sepolia network
- Ensure wallet has ETH for gas

### "Extension not detecting"
- Reload page
- Check extension is enabled
- Check console for errors

### "Already claimed"
- Use a different wallet address
- Or reset claim status in contract
