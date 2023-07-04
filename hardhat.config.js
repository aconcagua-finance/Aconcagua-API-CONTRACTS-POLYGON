const { readFileSync, existsSync } = require('fs');
const { parse } = require('dotenv');

require('@nomiclabs/hardhat-waffle');
// require('@nomiclabs/hardhat-etherscan'); // TODO PROBAR SI ERA POR ESTO QUE ROMPIA
// require('dotenv').config();

const getEnvConfig = (key) => {
  return process.env[key];
};

const loadDotEnvSync = () => {
  const FILE_NAME_ENV = '.env';

  // const envFilePath = resolve(resolveStagePath(options), FILE_NAME_ENV)
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
const WALLET_PRIVATE_KEY = getEnvConfig('WALLET_PRIVATE_KEY');
const HARDHAT_NETWORK_NAME = getEnvConfig('HARDHAT_NETWORK_NAME');
const POLYGONSCAN_API_KEY = getEnvConfig('POLYGONSCAN_API_KEY');
const ETHERSCAN_API_KEY = getEnvConfig('ETHERSCAN_API_KEY');

if (!ENVIRONMENT) {
  loadConfigSync();
}

if (ENVIRONMENT === 'local') {
  // This is a sample Hardhat task. To learn how to create your own go to
  // https://hardhat.org/guides/create-task.html
  // task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  //   const accounts = await hre.ethers.getSigners();
  //   for (const account of accounts) {
  //     console.log(account.address);
  //   }
  // });
}
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: '0.8.18',
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  defaultNetwork: HARDHAT_NETWORK_NAME, // muy importante para que tome la red esta
  networks: {
    [HARDHAT_NETWORK_NAME]: {
      url: HARDHAT_API_URL || '',
      accounts: WALLET_PRIVATE_KEY ? [WALLET_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      // ethereum
      mainnet: ETHERSCAN_API_KEY,
      ropsten: ETHERSCAN_API_KEY,
      rinkeby: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
      kovan: ETHERSCAN_API_KEY,

      // polygon
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY,
    },
  },
};
