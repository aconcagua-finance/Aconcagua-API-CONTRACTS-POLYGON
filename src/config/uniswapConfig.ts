/* eslint-disable operator-linebreak */
const { Token, SupportedChainId, Percent } = require('@uniswap/sdk-core');
const { FeeAmount } = require('@uniswap/v3-sdk');
const { SwapType } = require('@uniswap/smart-order-router');
const { ContractTypes } = require('../types/contractTypes');
const {
  PROVIDER_NETWORK_NAME,
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  USDM_TOKEN_ADDRESS,
  WBTC_TOKEN_ADDRESS,
} = require('./appConfig');

export const chainId =
  PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON : SupportedChainId.SEPOLIA;

export const swapOptions = {
  recipient: ContractTypes.EMPTY_ADDRESS, // Can be replaced with vault's
  slippageTolerance:
    PROVIDER_NETWORK_NAME === 'matic' ? new Percent(5, 1000) : new Percent(10, 100), // 0.5% for Polygon; 10% for Goerli
  deadline: Math.floor(Date.now() / 1000 + 60 * 10), // 10 min
  type: SwapType.SWAP_ROUTER_02, // Ver Universal Router
};

// Default quotes
export const quoteAmounts = {
  wbtc: 2,
};

// Supported tokens
export const tokens = {
  wbtc: new Token(chainId, WBTC_TOKEN_ADDRESS, 8, 'wbtc', 'Wrapped Bitcoin'),
};

export const stableCoins = {
  usdc: new Token(chainId, USDC_TOKEN_ADDRESS, 6, 'usdc', 'USD Coin'),
  usdt: new Token(chainId, USDT_TOKEN_ADDRESS, 6, 'usdt', 'USD Tether'),
  usdm: new Token(chainId, USDM_TOKEN_ADDRESS, 6, 'usdm', 'USD Mountain'),
};

// TokenOut: quotations and swaps depending on paths relies on.
export const tokenOut = new Token(chainId, USDT_TOKEN_ADDRESS, 6, 'usdt', 'USD Tether');

export const staticPaths =
  PROVIDER_NETWORK_NAME === 'matic'
    ? {
        // Prod
        wbtc: {
          tokens: [tokens.wbtc.address, tokenOut.address],
          fees: [FeeAmount.LOW],
        },
      }
    : {
        // Catedral
        wbtc: {
          tokens: [tokens.wbtc.address, tokenOut.address],
          fees: [FeeAmount.LOW], // https://app.uniswap.org/pools/89645?chain=goerli
        },
      };
