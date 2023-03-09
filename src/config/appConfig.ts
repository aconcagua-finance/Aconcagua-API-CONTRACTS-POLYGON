// import { Config } from '@abdalamichel/vs-core';
import { Config } from '../vs-core';

let environment = Config.getEnvConfig('ENVIRONMENT');

if (!environment) {
  Config.loadConfigSync();

  environment = Config.getEnvConfig('ENVIRONMENT');
}

export const ENVIRONMENT = environment;
export const SYS_ADMIN_EMAIL = Config.getEnvConfig('SYS_ADMIN_EMAIL');
export const NEW_USERS_TEMP_PASSWORD = Config.getEnvConfig('NEW_USERS_TEMP_PASSWORD');

export const FIREB_API_KEY = Config.getEnvConfig('FIREB_API_KEY');
export const FIREB_AUTH_DOMAIN = Config.getEnvConfig('FIREB_AUTH_DOMAIN');
export const FIREB_PROJECT_ID = Config.getEnvConfig('FIREB_PROJECT_ID');
export const FIREB_STORAGE_BUCKET = Config.getEnvConfig('FIREB_STORAGE_BUCKET');
export const FIREB_MESSAGING_SENDER_ID = Config.getEnvConfig('FIREB_MESSAGING_SENDER_ID');
export const FIREB_MEASURAMENT_ID = Config.getEnvConfig('FIREB_MEASURAMENT_ID');
export const FIREB_APP_ID = Config.getEnvConfig('FIREBASE_APP_ID');

export const WALLET_PRIVATE_KEY = Config.getEnvConfig('WALLET_PRIVATE_KEY');
export const ALCHEMY_API_KEY = Config.getEnvConfig('ALCHEMY_API_KEY');
export const HARDHAT_API_URL = Config.getEnvConfig('HARDHAT_API_URL');
export const HARDHAT_NETWORK_NAME = Config.getEnvConfig('HARDHAT_NETWORK_NAME');
export const PROVIDER_NETWORK_NAME = Config.getEnvConfig('PROVIDER_NETWORK_NAME');
export const POLYGONSCAN_API_KEY = Config.getEnvConfig('POLYGONSCAN_API_KEY');
export const ETHERSCAN_API_KEY = Config.getEnvConfig('ETHERSCAN_API_KEY');
export const USDC_TOKEN_ADDRESS = Config.getEnvConfig('USDC_TOKEN_ADDRESS');
export const USDT_TOKEN_ADDRESS = Config.getEnvConfig('USDT_TOKEN_ADDRESS');
export const WBTC_TOKEN_ADDRESS = Config.getEnvConfig('WBTC_TOKEN_ADDRESS');
export const WETH_TOKEN_ADDRESS = Config.getEnvConfig('WETH_TOKEN_ADDRESS');
export const GAS_STATION_URL = Config.getEnvConfig('GAS_STATION_URL');
export const COINGECKO_URL = Config.getEnvConfig('COINGECKO_URL');
export const BINANCE_URL = Config.getEnvConfig('BINANCE_URL');
