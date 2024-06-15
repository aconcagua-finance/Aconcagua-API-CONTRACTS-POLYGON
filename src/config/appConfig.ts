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

export const DEPLOYER_PRIVATE_KEY = Config.getEnvConfig('DEPLOYER_PRIVATE_KEY');
export const SWAPPER_PRIVATE_KEY = Config.getEnvConfig('SWAPPER_PRIVATE_KEY');
export const ALCHEMY_API_KEY = Config.getEnvConfig('ALCHEMY_API_KEY');
export const HARDHAT_API_URL = Config.getEnvConfig('HARDHAT_API_URL');
export const HARDHAT_NETWORK_NAME = Config.getEnvConfig('HARDHAT_NETWORK_NAME');
export const PROVIDER_NETWORK_NAME = Config.getEnvConfig('PROVIDER_NETWORK_NAME');
export const POLYGONSCAN_API_KEY = Config.getEnvConfig('POLYGONSCAN_API_KEY');
export const ETHERSCAN_API_KEY = Config.getEnvConfig('ETHERSCAN_API_KEY');
// We use ?.toLowerCase() because RSK has a different address checksum (capitalizationof letters) that Ethereum
export const USDC_TOKEN_ADDRESS = Config.getEnvConfig('USDC_TOKEN_ADDRESS')?.toLowerCase();
export const USDT_TOKEN_ADDRESS = Config.getEnvConfig('USDT_TOKEN_ADDRESS')?.toLowerCase();
export const USDM_TOKEN_ADDRESS = Config.getEnvConfig('USDM_TOKEN_ADDRESS')?.toLowerCase();
export const WBTC_TOKEN_ADDRESS = Config.getEnvConfig('WBTC_TOKEN_ADDRESS')?.toLowerCase();
export const WETH_TOKEN_ADDRESS = Config.getEnvConfig('WETH_TOKEN_ADDRESS')?.toLowerCase();
export const QUOTER2_CONTRACT_ADDRESS = Config.getEnvConfig('QUOTER2_CONTRACT_ADDRESS')?.toLowerCase();
export const SWAP_ROUTER_V3_ADDRESS = Config.getEnvConfig('SWAP_ROUTER_V3_ADDRESS')?.toLowerCase();
export const SWAPPER_ADDRESS = Config.getEnvConfig('SWAPPER_ADDRESS')?.toLowerCase();
export const OPERATOR1_ADDRESS = Config.getEnvConfig('OPERATOR1_ADDRESS')?.toLowerCase();
export const OPERATOR2_ADDRESS = Config.getEnvConfig('OPERATOR2_ADDRESS')?.toLowerCase();
export const OPERATOR3_ADDRESS = Config.getEnvConfig('OPERATOR3_ADDRESS')?.toLowerCase();
export const DEFAULT_RESCUE_WALLET_ADDRESS = Config.getEnvConfig('DEFAULT_RESCUE_WALLET_ADDRESS')?.toLowerCase();
export const DEFAULT_WITHDRAW_WALLET_ADDRESS = Config.getEnvConfig(
  'DEFAULT_WITHDRAW_WALLET_ADDRESS'
)?.toLowerCase();

// Mumbai Safe account creation (QA only)
export const ALIQ1_ADDRESS = Config.getEnvConfig('ALIQ1_ADDRESS')?.toLowerCase();
export const ALIQ2_ADDRESS = Config.getEnvConfig('ALIQ2_ADDRESS')?.toLowerCase();

export const GAS_STATION_URL = Config.getEnvConfig('GAS_STATION_URL');
export const COINGECKO_URL = Config.getEnvConfig('COINGECKO_URL');
export const KRAKEN_URL = Config.getEnvConfig('KRAKEN_URL');
export const BINANCE_URL = Config.getEnvConfig('BINANCE_URL');
export const API_PATH_QUOTES = Config.getEnvConfig('API_PATH_QUOTES');
