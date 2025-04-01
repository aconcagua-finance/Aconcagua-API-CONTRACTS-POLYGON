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

export const CONFIG_NETWORK_COLLECTION = Config.getEnvConfig('CONFIG_NETWORK_COLLECTION');
export const DEPLOYER_PRIVATE_KEY_POLYGON = Config.getEnvConfig('DEPLOYER_PRIVATE_KEY_POLYGON');
export const DEPLOYER_PRIVATE_KEY_ROOTSTOCK = Config.getEnvConfig('DEPLOYER_PRIVATE_KEY_ROOTSTOCK');
export const SWAPPER_PRIVATE_KEY_POLYGON = Config.getEnvConfig('SWAPPER_PRIVATE_KEY_POLYGON');
export const SWAPPER_PRIVATE_KEY_ROOTSTOCK = Config.getEnvConfig('SWAPPER_PRIVATE_KEY_ROOTSTOCK');

export const COINGECKO_URL = Config.getEnvConfig('COINGECKO_URL');
export const KRAKEN_URL = Config.getEnvConfig('KRAKEN_URL');
export const BINANCE_URL = Config.getEnvConfig('BINANCE_URL');
export const API_PATH_QUOTES = Config.getEnvConfig('API_PATH_QUOTES');
