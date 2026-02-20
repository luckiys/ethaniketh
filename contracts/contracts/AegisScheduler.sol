// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IHederaScheduleService.sol";

/**
 * @title AegisScheduler
 * @notice On-chain automation contract for AegisOS DeFi rebalancing.
 *
 * FLOW:
 *   1. AegisOS strategist produces a strategy plan identified by planHash.
 *   2. Human approves the plan with an EIP-712 signature (off-chain).
 *   3. AegisOS executor calls approvePlan(planHash) on this contract,
 *      recording the approval permanently on Hedera EVM.
 *   4. Executor calls scheduleRebalance(...) which invokes the Hedera
 *      Schedule Service precompile to create a FUTURE scheduled token
 *      transfer — fully on-chain, no backend cron required.
 *   5. The scheduled transfer executes automatically when signatories
 *      sign it (or at expiry).
 *
 * WHY CONTRACT-DRIVEN:
 *   Scheduling is initiated FROM this contract via a system contract call,
 *   satisfying the Hedera bounty requirement that "scheduling must be
 *   initiated from a smart contract, not only from a backend script."
 *
 * @dev Hedera Schedule Service precompile:
 *      0x000000000000000000000000000000000000022b
 */
contract AegisScheduler {
    // ─── Constants ──────────────────────────────────────────────────────────
    address public constant HEDERA_SCHEDULE_SERVICE =
        address(0x000000000000000000000000000000000000022b);

    int64 private constant HEDERA_SUCCESS = 22;

    // ─── State ───────────────────────────────────────────────────────────────
    address public owner;

    /// planHash → approved flag
    mapping(bytes32 => bool) public approvedPlans;

    /// planHash → Schedule entity address (set after scheduleRebalance)
    mapping(bytes32 => address) public scheduleAddresses;

    /// planHash → block timestamp when approved
    mapping(bytes32 => uint256) public approvalTimestamps;

    // ─── Events ──────────────────────────────────────────────────────────────
    event PlanApproved(bytes32 indexed planHash, address approvedBy, uint256 timestamp);

    event RebalanceScheduled(
        bytes32 indexed planHash,
        address indexed token,
        address sender,
        address receiver,
        int64  amount,
        address scheduleAddress
    );

    event ScheduleSigned(bytes32 indexed planHash, address scheduleAddress, address signer);

    // ─── Access control ───────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "AegisScheduler: caller is not owner");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Plan management ─────────────────────────────────────────────────────

    /**
     * @notice Records a human-approved strategy plan hash on-chain.
     *         Called by the AegisOS executor after verifying the EIP-712
     *         approval signature off-chain.
     *
     * @param planHash  keccak256 of the JSON-serialised StrategyPlan
     */
    function approvePlan(bytes32 planHash) external onlyOwner {
        require(!approvedPlans[planHash], "AegisScheduler: plan already approved");
        approvedPlans[planHash] = true;
        approvalTimestamps[planHash] = block.timestamp;
        emit PlanApproved(planHash, msg.sender, block.timestamp);
    }

    // ─── Scheduling ──────────────────────────────────────────────────────────

    /**
     * @notice Creates a scheduled HTS token transfer via the Hedera
     *         Schedule Service system contract.
     *
     *         The plan must have been approved via approvePlan() first.
     *         Each plan can only be scheduled once.
     *
     * @param planHash  Approved plan identifier
     * @param token     HTS token EVM address
     * @param sender    Account sending tokens (must hold balance)
     * @param receiver  Account receiving tokens
     * @param amount    Token amount (smallest denomination, positive)
     */
    function scheduleRebalance(
        bytes32 planHash,
        address token,
        address sender,
        address receiver,
        int64  amount
    ) external onlyOwner {
        require(approvedPlans[planHash],  "AegisScheduler: plan not approved");
        require(
            scheduleAddresses[planHash] == address(0),
            "AegisScheduler: already scheduled"
        );
        require(amount > 0, "AegisScheduler: amount must be positive");

        IHederaScheduleService schedSvc =
            IHederaScheduleService(HEDERA_SCHEDULE_SERVICE);

        (int64 responseCode, address scheduleAddress) =
            schedSvc.scheduleTokenTransfer(token, sender, receiver, amount);

        require(responseCode == HEDERA_SUCCESS, "AegisScheduler: schedule creation failed");

        scheduleAddresses[planHash] = scheduleAddress;

        emit RebalanceScheduled(
            planHash, token, sender, receiver, amount, scheduleAddress
        );
    }

    // ─── Signing ─────────────────────────────────────────────────────────────

    /**
     * @notice Countersigns a pending scheduled transaction.
     *         When all required signatories have signed the schedule
     *         executes automatically on Hedera.
     *
     * @param planHash  Plan whose schedule we are signing
     */
    function signScheduledRebalance(bytes32 planHash) external {
        address scheduleAddress = scheduleAddresses[planHash];
        require(scheduleAddress != address(0), "AegisScheduler: not scheduled");

        IHederaScheduleService schedSvc =
            IHederaScheduleService(HEDERA_SCHEDULE_SERVICE);

        int64 responseCode = schedSvc.signSchedule(scheduleAddress);
        require(responseCode == HEDERA_SUCCESS, "AegisScheduler: sign failed");

        emit ScheduleSigned(planHash, scheduleAddress, msg.sender);
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    function getScheduleAddress(bytes32 planHash) external view returns (address) {
        return scheduleAddresses[planHash];
    }

    function isPlanApproved(bytes32 planHash) external view returns (bool) {
        return approvedPlans[planHash];
    }

    function isScheduled(bytes32 planHash) external view returns (bool) {
        return scheduleAddresses[planHash] != address(0);
    }

    // ─── Owner transfer ───────────────────────────────────────────────────────

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AegisScheduler: zero address");
        owner = newOwner;
    }
}
