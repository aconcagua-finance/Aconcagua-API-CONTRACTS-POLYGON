const { readFileSync, existsSync } = require('fs');
const { parse } = require('dotenv');

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('dotenv').config();

const getEnvConfig = (key) => {
  return process.env[key];
};

const loadDotEnvSync = () => {
  const FILE_NAME_ENV = '.env';
  const envFilePath = FILE_NAME_ENV;

  if (!existsSync(envFilePath)) return {};

  const data = readFileSync(envFilePath);

  return parse(data);
};

const updateEnv = (env) => {
  if (env)
    process.env = {
      ...process.env,
      ...env,
    };

  return process.env;
};

const loadConfigSync = () => {
  const dotEnvData = loadDotEnvSync();

  updateEnv(dotEnvData);
};

const ENVIRONMENT = getEnvConfig('ENVIRONMENT');
const HARDHAT_API_URL = getEnvConfig('HARDHAT_API_URL');
const DEPLOYER_PRIVATE_KEY = getEnvConfig('DEPLOYER_PRIVATE_KEY');
const HARDHAT_NETWORK_NAME = getEnvConfig('HARDHAT_NETWORK_NAME');
const POLYGONSCAN_API_KEY = getEnvConfig('POLYGONSCAN_API_KEY');
const ETHERSCAN_API_KEY = getEnvConfig('ETHERSCAN_API_KEY');

if (!ENVIRONMENT) {
  loadConfigSync();
}

if (ENVIRONMENT === 'local') {
  // Local tasks or configuration for the local environment
}

const namedAccounts = require('./hardhat.accounts');

module.exports = {
  solidity: '0.8.18',
  settings: {
    optimizer: {
      enabled: true,
      runs: 400,
    },
  },
  defaultNetwork: HARDHAT_NETWORK_NAME, // Set default network based on ENV variable
  networks: {
    [HARDHAT_NETWORK_NAME]: {
      url: HARDHAT_API_URL || '',
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      blockGasLimit: 12000000,
      gas: 'auto',
      gasPrice: 'auto',
      gasMultiplier: 1,
      allowUnlimitedContractSize: true,
      chainId: 31337,
    },
    polygon: {
      url: 'https://polygon-rpc.com', // Mainnet URL
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.1,
      chainId: 137,
    },
    polygonMumbai: {
      url: 'https://rpc-mumbai.maticvigil.com', // Mumbai Testnet URL
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.1,
      chainId: 80001,
    },
    sepolia: {
      url: 'https://rpc.sepolia.org', // Sepolia Testnet URL
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.2,
      chainId: 11155111,
    },
    rsktest: {
      url: 'https://public-node.testnet.rsk.co',
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1,
      chainId: 31,
    },
  },
  namedAccounts,
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: '8RZVT4TC2ZCEM8TMKVBQ4CYCNGIKWWTZMK',
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
      rsktest: '7Cv0hCwRbuBFWMD2iixK9i6nPXoX8T-T',
    },
    customChains: [
      {
        network: 'rsktest',
        chainId: 31,
        urls: {
          apiURL: 'https://blockscout.com/rsktestnet/api',
          browserURL: 'https://blockscout.com/rsktestnet',
        },
      },
    ],
  },
};
