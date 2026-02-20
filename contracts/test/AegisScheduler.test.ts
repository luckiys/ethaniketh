import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { AegisScheduler } from '../typechain-types';

/**
 * Unit tests for AegisScheduler on the local Hardhat network.
 *
 * The Hedera Schedule Service precompile (0x...022b) is NOT available on
 * the local Hardhat network, so scheduleRebalance() cannot be tested
 * end-to-end here. Those tests run on Hedera Testnet.
 *
 * We test:
 *   - Ownership and access control
 *   - approvePlan() state changes and events
 *   - scheduleRebalance() plan-not-approved guard
 *   - View helpers
 */
describe('AegisScheduler', () => {
  let scheduler: AegisScheduler;
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>;
  let other: Awaited<ReturnType<typeof ethers.getSigner>>;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('AegisScheduler');
    scheduler = (await Factory.deploy()) as AegisScheduler;
    await scheduler.waitForDeployment();
  });

  it('sets owner on deploy', async () => {
    expect(await scheduler.owner()).to.equal(owner.address);
  });

  it('rejects non-owner approvePlan', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('test-plan'));
    await expect(scheduler.connect(other).approvePlan(hash))
      .to.be.revertedWith('AegisScheduler: caller is not owner');
  });

  it('approvePlan emits PlanApproved and sets state', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('plan-1'));
    await expect(scheduler.approvePlan(hash))
      .to.emit(scheduler, 'PlanApproved')
      .withArgs(hash, owner.address, await ethers.provider.getBlock('latest').then(b => b!.timestamp + 1));

    expect(await scheduler.isPlanApproved(hash)).to.be.true;
  });

  it('prevents double-approving a plan', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('plan-2'));
    await scheduler.approvePlan(hash);
    await expect(scheduler.approvePlan(hash))
      .to.be.revertedWith('AegisScheduler: plan already approved');
  });

  it('rejects scheduleRebalance for unapproved plan', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('unapproved'));
    const fakeToken = ethers.ZeroAddress;
    await expect(
      scheduler.scheduleRebalance(hash, fakeToken, owner.address, other.address, 100)
    ).to.be.revertedWith('AegisScheduler: plan not approved');
  });

  it('isScheduled returns false before scheduling', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('plan-3'));
    expect(await scheduler.isScheduled(hash)).to.be.false;
  });

  it('getScheduleAddress returns zero before scheduling', async () => {
    const hash = ethers.keccak256(ethers.toUtf8Bytes('plan-4'));
    expect(await scheduler.getScheduleAddress(hash)).to.equal(ethers.ZeroAddress);
  });

  it('allows owner transfer', async () => {
    await scheduler.transferOwnership(other.address);
    expect(await scheduler.owner()).to.equal(other.address);
  });

  it('rejects zero-address ownership transfer', async () => {
    await expect(scheduler.transferOwnership(ethers.ZeroAddress))
      .to.be.revertedWith('AegisScheduler: zero address');
  });
});
