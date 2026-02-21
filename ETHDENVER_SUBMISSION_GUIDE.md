# AegisOS — ETHDenver Submission Guide

Step-by-step instructions to get AegisOS submission-ready.

---

## Step 1: Run locally (or deploy to Vercel later)

For now, run locally:

```bash
cd /Users/lakulishsaini/Downloads/ethaniketh-main
npm run dev
```

**App:** http://localhost:3000

When you're ready to deploy for judges, see **Step 1b** below.

---

## Step 1b: Deploy to Vercel (optional — do when ready for submission)

### 1.1 Push your code to GitHub

```bash
cd /Users/lakulishsaini/Downloads/ethaniketh-main

# Ensure repo is public
git remote -v   # Check you have origin

# Commit any uncommitted changes
git add .
git commit -m "ETHDenver submission prep"
git push origin main
```

### 1.2 Create Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. Click **Add New** → **Project**.
3. Import your GitHub repo.
4. **Root Directory:** Set to `frontend` (click Edit, enter `frontend`).
5. **Framework Preset:** Next.js (auto-detected).
6. **Build Command:** `npm run build` (from vercel.json).
7. **Install Command:** `cd .. && npm run install:all` (from vercel.json).

### 1.3 Add environment variables

In Vercel → Project → **Settings** → **Environment Variables**, add:

| Variable | Value | Required? |
|----------|-------|-----------|
| `HEDERA_OPERATOR_ID` | Your account ID | For HCS |
| `HEDERA_OPERATOR_KEY` | Your ED25519 key | For HCS |
| `HEDERA_EVM_DEPLOYER_KEY` | Your ECDSA key | For Schedule Service |
| `AEGIS_SCHEDULER_ADDRESS` | Contract address | After Step 2 |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From cloud.walletconnect.com | Yes |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | From alchemy.com | Recommended |
| `GEMINI_API_KEY` | From aistudio.google.com | For explanations |
| `ZEROG_PRIVATE_KEY` | 0g testnet key | For real 0g uploads |

**Note:** Leave `VAR_SERVICE_URL` and `PORTFOLIO_SERVICE_URL` empty for Vercel — the Python services won't run there. The app will gracefully degrade.

### 1.4 Deploy

1. Click **Deploy**.
2. Wait for build to complete.
3. Copy your live URL (e.g. `aegisos.vercel.app`).

---

## Step 2: Deploy AegisScheduler Contract (Hedera Testnet)

### 2.1 Prerequisites

- `HEDERA_EVM_DEPLOYER_KEY` in `frontend/.env.local` (ECDSA hex key, not ED25519).
- EVM address funded with HBAR: [faucet.hedera.com](https://faucet.hedera.com).

### 2.2 Deploy

```bash
cd /Users/lakulishsaini/Downloads/ethaniketh-main/contracts
npm install
npx hardhat run scripts/deploy.ts --network hederaTestnet
```

### 2.3 Save the address

The script prints something like:
```
AegisScheduler deployed to: 0x1234...abcd
```

1. Copy the address.
2. Add `AEGIS_SCHEDULER_ADDRESS=0x1234...abcd` to Vercel env vars.
3. Redeploy the Vercel project so it picks up the new variable.

---

## Step 3: Record Demo Video (2–3 minutes)

### 3.1 What to show

1. **Intro (15 sec):** "AegisOS — AI advises, humans decide, blockchain verifies."
2. **Connect wallet (15 sec):** Connect MetaMask/Phantom on Base Sepolia.
3. **Enter holdings + goal (20 sec):** e.g. "1 ETH, 0.5 BTC" and "saving for a house."
4. **Run workflow (30 sec):** Click Run → show Watcher → Strategist → approval modal.
5. **Approve (20 sec):** Sign in wallet, show success.
6. **Show verification (20 sec):** Open Verification tab, show HCS tx link.
7. **Closing (10 sec):** "Live at [your-url].vercel.app, open source on GitHub."

### 3.2 Recording tips

- Use Loom, OBS, or QuickTime.
- 1080p, clear audio.
- Show the URL in the browser bar.
- Keep it under 3 minutes.

### 3.3 Where to upload

- YouTube (unlisted) or Loom.
- Add the link to your Devfolio submission and README.

---

## Step 4: Update README

### 4.1 Add at the top (after the tagline)

```markdown
**Live demo:** [https://your-app.vercel.app](https://your-app.vercel.app)  
**Demo video:** [Link to your 2–3 min video]
```

### 4.2 Add ETHDenver bounty mapping

```markdown
## ETHDenver 2026 Bounties

| Bounty | Prize | AegisOS implementation |
|--------|-------|-------------------------|
| Hedera Killer App (OpenClaw) | $10k | 3-agent pipeline, HCS audit, human-in-the-loop |
| Hedera Schedule Service | $5k | AegisScheduler.sol → Schedule Service precompile |
| 0g DeFAI | $7k | 0g Storage for agent brains, AI risk + strategy |
| 0g iNFT | $7k | Hedera HTS NFT with 0g:// metadata URI |
```

### 4.3 Update bounty table (in README)

Update the existing "Bounty targets" section with current prize amounts and links to Devfolio.

---

## Step 5: Add Error Messages for Optional Services

When VaR or Portfolio services are down, show a friendly message instead of silent fallback.

**Files to edit:**
- `frontend/src/server/agents/watcher.ts` — when VaR fetch fails
- `frontend/src/server/agents/strategist.ts` — when portfolio optimize fails
- `frontend/src/components/approval-modal.tsx` or run page — surface "Risk metrics temporarily unavailable" if relevant

(Optional — improves UX but not required for submission.)

---

## Step 6: Devfolio Submission

### 6.1 Create/update project

1. Go to [ethdenver2026.devfolio.co](https://ethdenver2026.devfolio.co).
2. **Projects** → **Add Project** (or edit existing).
3. Fill in:
   - **Project name:** AegisOS
   - **Tagline:** AI advises. Humans decide. Blockchain verifies.
   - **Description:** 2–3 paragraphs on problem, solution, tech.
   - **Live link:** Your Vercel URL
   - **Video:** Link to demo video
   - **GitHub:** Your repo URL
   - **Built for:** Select Hedera (Killer App, Schedule Service), 0g Labs (DeFAI, iNFT)

### 6.2 Submit to tracks

When submitting, select the bounty tracks you're targeting. You can submit to multiple.

**Note:** If not deployed yet, use "Local demo — see README for setup" or record a video showing localhost. Add the live URL to Devfolio once Vercel is ready.

---

## Checklist

- [ ] Run locally: `npm run dev` → http://localhost:3000
- [ ] (Later) Vercel deployed with env vars — when ready for judges
- [ ] AegisScheduler deployed to Hedera Testnet
- [ ] Demo video recorded and uploaded
- [ ] README updated with live link + video + bounty mapping
- [ ] Devfolio project created/updated
- [ ] Submitted to relevant bounty tracks

---

## Quick reference

| Item | Link/Command |
|------|--------------|
| Vercel | vercel.com |
| Hedera faucet | faucet.hedera.com |
| 0g faucet | faucet.0g.ai |
| WalletConnect ID | cloud.walletconnect.com |
| Alchemy key | alchemy.com |
| Gemini key | aistudio.google.com |
| Devfolio | ethdenver2026.devfolio.co |
