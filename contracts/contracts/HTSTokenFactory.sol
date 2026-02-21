// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// Minimal subset of IHederaTokenService needed for fungible token creation.
// Full interface: https://github.com/hashgraph/hedera-smart-contracts
interface IHederaTokenService {
    struct Expiry {
        int64 second;
        address autoRenewAccount;
        int64 autoRenewPeriod;
    }

    struct KeyValue {
        bool inheritAccountKey;
        address contractId;
        bytes ed25519;
        bytes ECDSA_secp256k1;
        address delegatableContractId;
    }

    struct TokenKey {
        uint256 keyType;
        KeyValue key;
    }

    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;   // false = INFINITE
        int64 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) external payable returns (int64 responseCode, address tokenAddress);
}

/**
 * @title HTSTokenFactory
 * @notice One-shot helper that creates an HTS fungible token and emits its address.
 *         Deploy, call create(), read the TokenCreated event.
 *         Must send ≥ 20 HBAR (20_000_000_000 tinybars) as msg.value.
 */
contract HTSTokenFactory {
    address constant HTS_PRECOMPILE = 0x0000000000000000000000000000000000000167;

    event TokenCreated(address indexed tokenAddress);

    function create(
        string calldata name,
        string calldata symbol,
        address treasury,
        int64 initialSupply,
        int32 decimals
    ) external payable returns (address tokenAddress) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry({
            second: 0,
            autoRenewAccount: treasury,
            autoRenewPeriod: 7776000  // 90 days
        });

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: treasury,
            memo: "AegisOS Demo Token",
            tokenSupplyType: false,   // INFINITE
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: expiry
        });

        (int64 code, address addr) = IHederaTokenService(HTS_PRECOMPILE)
            .createFungibleToken{value: msg.value}(token, initialSupply, decimals);

        require(code == 22, string(abi.encodePacked("HTS error: ", _itoa(code))));
        tokenAddress = addr;
        emit TokenCreated(addr);
    }

    function _itoa(int64 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        bytes memory buf = new bytes(20);
        uint256 i = 20;
        uint64 u = n < 0 ? uint64(-n) : uint64(n);
        while (u > 0) { buf[--i] = bytes1(uint8(48 + u % 10)); u /= 10; }
        if (n < 0) buf[--i] = '-';
        bytes memory out = new bytes(20 - i);
        for (uint256 j = 0; j < out.length; j++) out[j] = buf[i + j];
        return string(out);
    }
}
