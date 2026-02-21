// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title IHederaScheduleService
 * @notice Interface for the Hedera Schedule Service system contract.
 *         Deployed at the well-known address 0x000000000000000000000000000000000000022b
 *         on every Hedera network (Testnet, Mainnet, Previewnet).
 *
 * Response codes follow the Hedera ResponseCode enum.
 * SUCCESS = 22.
 *
 * @dev https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-smart-contracts/schedule-service
 */
interface IHederaScheduleService {
    /**
     * @notice Schedules a future HTS fungible token transfer.
     *         The scheduled transaction will execute once the required signatories
     *         have signed OR at the expiration time (whichever comes first).
     *
     * @param token    HTS token address (Hedera EVM alias of the token ID)
     * @param sender   Account sending the tokens
     * @param receiver Account receiving the tokens
     * @param amount   Amount in token's smallest denomination (positive integer)
     * @return responseCode  Hedera response code (22 = SUCCESS)
     * @return scheduleAddress  EVM address of the created Schedule entity
     */
    function scheduleTokenTransfer(
        address token,
        address sender,
        address receiver,
        int64 amount
    ) external returns (int64 responseCode, address scheduleAddress);

    /**
     * @notice Signs a pending scheduled transaction on behalf of msg.sender.
     *         When all required signatures are collected the schedule auto-executes.
     *
     * @param scheduleAddress  Address of the Schedule entity to sign
     * @return responseCode  22 = SUCCESS
     */
    function signSchedule(
        address scheduleAddress
    ) external returns (int64 responseCode);

    /**
     * @notice Schedules a HBAR (native) transfer.
     */
    function scheduleNativeTransfer(
        address receiver,
        uint64 amount
    ) external returns (int64 responseCode, address scheduleAddress);
}
