/**
 * Creates an AegisOS Demo Token (AGS) on Hedera Testnet via the HTS EVM precompile.
 *
 * Run:
 *   cd contracts
 *   npx hardhat run scripts/create-hts-token.ts --network hederaTestnet
 */
import { ethers } from 'hardhat';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Fee required by Hedera to create an HTS token (30 HBAR)
const TOKEN_CREATE_FEE = ethers.parseEther('30');

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('──────────────────────────────────────────────');
  console.log('HTS Token Creation via EVM Precompile');
  console.log('──────────────────────────────────────────────');
  console.log('Deployer:', deployer.address);
  console.log('Balance: ', ethers.formatEther(balance), 'HBAR');

  // 1. Deploy the factory helper
  console.log('\nDeploying HTSTokenFactory...');
  const Factory = await ethers.getContractFactory('HTSTokenFactory');
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log('  Factory:', await factory.getAddress());

  // 2. Call create() — Hedera requires ≥ 20 HBAR sent with the call
  console.log('\nCreating AGS fungible token...');
  const tx = await factory.create(
    'AegisOS Demo Token',   // name
    'AGS',                  // symbol
    deployer.address,       // treasury = deployer EVM address
    1_000_000n,             // initialSupply (in smallest unit; decimals = 2 → 10,000.00 AGS)
    2,                      // decimals
    { value: TOKEN_CREATE_FEE }
  );

  console.log('  Waiting for receipt...');
  const receipt = await tx.wait();

  // 3. Parse the TokenCreated event
  const iface = Factory.interface;
  let tokenEvmAddress = '';
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog(log as unknown as { topics: string[]; data: string });
      if (parsed?.name === 'TokenCreated') {
        tokenEvmAddress = parsed.args.tokenAddress;
        break;
      }
    } catch { /* not our event */ }
  }

  if (!tokenEvmAddress) {
    throw new Error('TokenCreated event not found — check the HTS response code in the tx');
  }

  // 4. Convert EVM address → Hedera token ID via mirror node
  //    EVM address = 0x000000000000000000000000000000000000XXXX
  //    Last 8 hex digits = account num in decimal
  const accountNum = BigInt(tokenEvmAddress).toString(10);
  // Hedera token IDs for testnet are shard.realm.num → 0.0.<num>
  const htsTokenId = `0.0.${accountNum}`;

  console.log('\n✓ HTS Token created');
  console.log('  EVM address:  ', tokenEvmAddress);
  console.log('  Hedera token ID:', htsTokenId);
  console.log('  HashScan:     https://hashscan.io/testnet/token/' + htsTokenId);

  // 5. Persist into deployed.json
  const outPath = join(__dirname, '..', 'deployed.json');
  let existing: Record<string, string> = {};
  try { existing = JSON.parse(readFileSync(outPath, 'utf8')); } catch {}
  existing.HTSToken = htsTokenId;
  existing.HTSTokenEVM = tokenEvmAddress;
  writeFileSync(outPath, JSON.stringify(existing, null, 2));

  // 6. Patch .env.local
  const envPath = join(__dirname, '..', '..', 'frontend', '.env.local');
  let env = readFileSync(envPath, 'utf8');
  env = env.replace(/^HEDERA_HTS_TOKEN_ID=.*$/m, `HEDERA_HTS_TOKEN_ID=${htsTokenId}`);
  writeFileSync(envPath, env);

  console.log('\nUpdated frontend/.env.local → HEDERA_HTS_TOKEN_ID=' + htsTokenId);
  console.log('──────────────────────────────────────────────');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
