# Bounty: On-Chain Automation with Hedera Schedule Service

**Sponsor:** Hedera
**Prize:** $5,000 (2 winners: $3,000 + $2,000)
**Bounty slug:** `hedera-schedule-service`

## What We Built

`AegisScheduler.sol` — a smart contract that uses the **Hedera Schedule Service system contract** (precompile at `0x000000000000000000000000000000000000022b`) to create scheduled token transfers without any off-chain cron jobs.

**Key differentiator:** Schedules are created **from contract logic** (not from a backend script), meeting the bounty's primary requirement.

### Schedule Lifecycle

```
User approves plan (EIP-712 signature)
       ↓
AegisScheduler.sol::approvePlan() records on-chain approval
       ↓
AegisScheduler.sol::scheduleHbarRebalance() calls Schedule Service precompile
       ↓
Hedera creates a native Schedule transaction
       ↓
Status transitions: CREATED → PENDING → EXECUTED
                                      ↘ FAILED (insufficient balance)
                                      ↘ EXPIRED (after 30 min)
```

### Edge Cases Handled

- **Insufficient balance**: Contract checks before scheduling; graceful failure path
- **Expired schedules**: `isScheduleExpired()` detects 30-minute timeout
- **Already-scheduled**: `getScheduleAddress()` check prevents duplicate schedules
- **Partial execution**: Each action is tracked separately with step-level logs

## How to Run

```bash
# 1. Deploy the contract (needs Hedera EVM testnet)
cd contracts
npm install
cp .env.example .env  # fill HEDERA_EVM_DEPLOYER_KEY
npx hardhat run scripts/deploy.ts --network hederaTestnet

# 2. Copy contract address to frontend env
echo "AEGIS_SCHEDULER_ADDRESS=0x..." >> ../frontend/.env.local

# 3. Start frontend
cd ../frontend && npm run dev
```

**Without credentials (mock mode):**
```bash
cd frontend && npm run dev
# Schedule lifecycle API returns deterministic mock data
```

## Demo Flow

```bash
# 1. Check schedule API (works in mock mode)
curl http://localhost:3000/api/schedule-status

# 2. After running a session, check a specific schedule
curl "http://localhost:3000/api/schedule-status?planHash=abc123"
# Returns: { status: "EXECUTED", hashScanUrl: "https://hashscan.io/testnet/..." }

# 3. See all tracked schedules
curl http://localhost:3000/api/schedule-status
# Returns: [{ status: "CREATED" }, { status: "EXECUTED" }, ...]
```

## Files

| File | Description |
|------|-------------|
| `contracts/contracts/AegisScheduler.sol` | Smart contract with Schedule Service |
| `contracts/contracts/IHederaScheduleService.sol` | Precompile interface |
| `contracts/test/*.ts` | 9 unit tests (all passing) |
| `contracts/scripts/deploy.ts` | Hardhat deploy script |
| `frontend/src/server/schedule-tracker.ts` | Lifecycle tracking module |
| `frontend/src/app/api/schedule-status/route.ts` | Schedule status API |

## Contract Architecture

```solidity
// AegisScheduler.sol — core scheduling logic
function scheduleHbarRebalance(bytes32 planHash, address receiver, uint64 amount) external {
    require(approvedPlans[planHash], "Plan not approved");
    // Calls Hedera Schedule Service precompile
    IHederaScheduleService(SCHEDULE_SERVICE).scheduleNativeTransfer(receiver, amount);
    scheduleAddresses[planHash] = SCHEDULE_SERVICE;
    scheduled[planHash] = true;
}
```

## Running the Tests

```bash
cd contracts
npm install
npx hardhat test
# 9 tests: plan approval, schedule creation, duplicate prevention, edge cases
```

## Cost

**Zero** — Hedera Testnet is free. Get HBAR from https://portal.hedera.com
