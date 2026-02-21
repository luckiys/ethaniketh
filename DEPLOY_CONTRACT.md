# Deploy AegisScheduler to Hedera Testnet

Step-by-step guide.

---

## Prerequisites

You need an **ECDSA** private key (hex, starts with `0x`) and its EVM address funded with HBAR.

Your `frontend/.env.local` already has:
```
HEDERA_EVM_DEPLOYER_KEY=0xd1fa357d86dd36406481670190958159389e5cdba2fc777864869a37448eea24
```

---

## Step 1: Get your EVM address

From the project root:

```bash
cd /Users/lakulishsaini/Downloads/ethaniketh-main
node -e "
const { privateKeyToAccount } = require('viem/accounts');
const pk = '0xd1fa357d86dd36406481670190958159389e5cdba2fc777864869a37448eea24';
const account = privateKeyToAccount(pk);
console.log('EVM address:', account.address);
"
```

If that fails (viem not in path), use:

```bash
cd contracts
npx hardhat console --network hederaTestnet
```

Then in the console:
```javascript
const [signer] = await ethers.getSigners();
console.log(signer.address);
.exit
```

**Write down the address** (e.g. `0x1234...abcd`).

---

## Step 2: Fund the EVM address with HBAR

1. Go to **[faucet.hedera.com](https://faucet.hedera.com)**
2. Choose **Hedera Testnet**
3. Either:
   - **Option A:** Connect a wallet (MetaMask) that holds that EVM address and request test HBAR
   - **Option B:** If your Hedera account ID is `0.0.7974794`, fund that account — the EVM alias may share the balance
4. Get at least **1–2 HBAR** for deployment

---

## Step 3: Deploy the contract

```bash
cd /Users/lakulishsaini/Downloads/ethaniketh-main/contracts
npm install
npx hardhat run scripts/deploy.ts --network hederaTestnet
```

---

## Step 4: If you see "Deployer has 0 HBAR"

Your EVM address has no balance. Options:

1. **Fund via account ID:** At [portal.hedera.com](https://portal.hedera.com), get your account ID for the ECDSA key. Fund that account at [faucet.hedera.com](https://faucet.hedera.com).
2. **Create a new EVM wallet:** Create a new MetaMask account, copy the private key, put it in `HEDERA_EVM_DEPLOYER_KEY`, fund that address at the faucet, then deploy again.

---

## Step 5: Save the contract address

When deploy succeeds, you'll see:

```
✓ AegisScheduler deployed
  Contract address: 0x...
  Add this to frontend/.env.local:
    AEGIS_SCHEDULER_ADDRESS=0x...
```

1. Copy the address
2. Open `frontend/.env.local`
3. Set: `AEGIS_SCHEDULER_ADDRESS=0x...` (paste your address)
4. Restart the dev server: `npm run dev`

---

## Step 6: Verify on HashScan (optional)

```bash
cd contracts
npx hardhat verify --network hederaTestnet <YOUR_CONTRACT_ADDRESS>
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Deployer has 0 HBAR` | Fund the EVM address at faucet.hedera.com |
| `invalid array length` or key error | Ensure `HEDERA_EVM_DEPLOYER_KEY` is a 64-char hex string with `0x` prefix |
| `network` or `chainId` error | Hardhat reads from `frontend/.env.local` — ensure that file exists |
| `Cannot find module` | Run `npm install` in the `contracts` folder |
