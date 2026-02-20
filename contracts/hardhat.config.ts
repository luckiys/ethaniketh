import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config({ path: require('path').join(__dirname, '..', 'frontend', '.env.local') });

// Hedera Testnet JSON-RPC Relay
// All Hedera EVM contracts are deployed here; HashScan indexes them.
const HEDERA_TESTNET_RPC = 'https://testnet.hashio.io/api';
const HEDERA_TESTNET_CHAIN_ID = 296;

// Hedera Mainnet JSON-RPC Relay (leave blank for testnet-only deployments)
const HEDERA_MAINNET_RPC = 'https://mainnet.hashio.io/api';
const HEDERA_MAINNET_CHAIN_ID = 295;

// Private key of the deployer account (Hedera EVM alias key).
// Use the ECDSA key exported from portal.hedera.com, NOT the ED25519 key.
// The corresponding EVM address needs HBAR for gas.
const DEPLOYER_PRIVATE_KEY = process.env.HEDERA_EVM_DEPLOYER_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // Local Hardhat network (for unit tests)
    hardhat: {},

    // Hedera Testnet — used for demo and bounty submission
    hederaTestnet: {
      url: HEDERA_TESTNET_RPC,
      chainId: HEDERA_TESTNET_CHAIN_ID,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },

    // Hedera Mainnet — production only
    hederaMainnet: {
      url: HEDERA_MAINNET_RPC,
      chainId: HEDERA_MAINNET_CHAIN_ID,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  // Etherscan-compatible block explorer for HashScan verification
  // npx hardhat verify --network hederaTestnet <address>
  etherscan: {
    apiKey: {
      hederaTestnet: 'no-api-key-needed', // HashScan doesn't require an API key
      hederaMainnet: 'no-api-key-needed',
    },
    customChains: [
      {
        network: 'hederaTestnet',
        chainId: HEDERA_TESTNET_CHAIN_ID,
        urls: {
          apiURL: 'https://server-verify.hashscan.io',
          browserURL: 'https://hashscan.io/testnet',
        },
      },
      {
        network: 'hederaMainnet',
        chainId: HEDERA_MAINNET_CHAIN_ID,
        urls: {
          apiURL: 'https://server-verify.hashscan.io',
          browserURL: 'https://hashscan.io/mainnet',
        },
      },
    ],
  },
};

export default config;
