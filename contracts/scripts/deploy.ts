import { ethers } from 'hardhat';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Deploys AegisScheduler.sol to Hedera EVM Testnet.
 *
 * Prerequisites:
 *   1. Set HEDERA_EVM_DEPLOYER_KEY in frontend/.env.local
 *      (ECDSA hex private key, NOT the ED25519 Hedera key)
 *   2. Fund the deployer address with HBAR on testnet:
 *      https://portal.hedera.com  or  https://faucet.hedera.com
 *
 * Run:
 *   cd contracts
 *   npx hardhat run scripts/deploy.ts --network hederaTestnet
 *
 * After deploy:
 *   Copy the printed address to AEGIS_SCHEDULER_ADDRESS in frontend/.env.local
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log('──────────────────────────────────────────────');
  console.log('AegisScheduler deploy');
  console.log('──────────────────────────────────────────────');
  console.log('Network:  ', (await ethers.provider.getNetwork()).name);
  console.log('Deployer: ', deployer.address);
  console.log('Balance:  ', ethers.formatEther(balance), 'HBAR');

  if (balance === 0n) {
    throw new Error(
      'Deployer has 0 HBAR. Fund it at https://faucet.hedera.com before deploying.'
    );
  }

  console.log('\nDeploying AegisScheduler...');
  const AegisScheduler = await ethers.getContractFactory('AegisScheduler');
  const scheduler = await AegisScheduler.deploy();
  await scheduler.waitForDeployment();

  const address = await scheduler.getAddress();

  console.log('\n✓ AegisScheduler deployed');
  console.log('  Contract address:', address);
  console.log('  HashScan:        https://hashscan.io/testnet/contract/' + address);

  // Fund contract with 0.01 HBAR for scheduleHbarRebalance (no HTS token needed)
  const fundAmount = ethers.parseEther('0.01');
  if (balance >= fundAmount) {
    console.log('\nFunding contract with 0.01 HBAR for HBAR scheduling...');
    const fundTx = await deployer.sendTransaction({
      to: address,
      value: fundAmount,
    });
    await fundTx.wait();
    console.log('  ✓ Contract funded');
  } else {
    console.log('\n⚠ Skipping contract fund (low balance). Send 0.01 HBAR to', address, 'for scheduleHbarRebalance.');
  }

  console.log('\nAdd this to frontend/.env.local:');
  console.log(`  AEGIS_SCHEDULER_ADDRESS=${address}`);

  // Auto-write address to a local file for the executor to read
  const outPath = join(__dirname, '..', 'deployed.json');
  writeFileSync(outPath, JSON.stringify({ AegisScheduler: address }, null, 2));
  console.log('\nSaved to contracts/deployed.json');
  console.log('──────────────────────────────────────────────');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
