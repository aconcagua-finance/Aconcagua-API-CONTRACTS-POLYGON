/* eslint-disable operator-linebreak */
const { Token, SupportedChainId, Percent } = require('@uniswap/sdk-core');
const { FeeAmount } = require('@uniswap/v3-sdk');
const { SwapType } = require('@uniswap/smart-order-router');
const { ContractTypes } = require('../types/contractTypes');
const {
  PROVIDER_NETWORK_NAME,
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  WBTC_TOKEN_ADDRESS,
  WETH_TOKEN_ADDRESS,
} = require('./appConfig');

export const chainId =
  PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON : SupportedChainId.GOERLI;

export const swapOptions = {
  recipient: ContractTypes.EMPTY_ADDRESS, // Can be replaced with vault's
  slippageTolerance:
    PROVIDER_NETWORK_NAME === 'matic' ? new Percent(5, 1000) : new Percent(10, 100), // 0.5% for polygon (ASK)
  deadline: Math.floor(Date.now() / 1000 + 60 * 10), // 10 min
  type: SwapType.SWAP_ROUTER_02, // Ver Universal Router
};

// Default quotes
export const quoteAmounts = {
  weth: 20,
  wbtc: 2,
};

// Supported tokens
export const tokens = {
  weth: new Token(chainId, WETH_TOKEN_ADDRESS, 18, 'weth', 'Wrapped Ethereum'),
  wbtc: new Token(chainId, WBTC_TOKEN_ADDRESS, 8, 'wbtc', 'Wrapped Bitcoin'),
};

export const stableCoins = {
  usdc: new Token(chainId, USDC_TOKEN_ADDRESS, 6, 'usdc', 'USD Coin'),
  usdt: new Token(chainId, USDT_TOKEN_ADDRESS, 6, 'usdt', 'USD Tether'),
};

// TokenOut: quotations and swaps depending on paths relies on.
export const tokenOut = new Token(chainId, USDC_TOKEN_ADDRESS, 6, 'usdc', 'USD Coin');

export const staticPaths =
  PROVIDER_NETWORK_NAME === 'matic'
    ? {
        // Prod
        weth: {
          tokens: [tokens.weth.address, tokenOut.address],
          fees: [FeeAmount.LOW],
        },
        wbtc: {
          tokens: [tokens.wbtc.address, tokens.weth.address, tokenOut.address],
          fees: [FeeAmount.LOW, FeeAmount.LOW],
        },
      }
    : {
        // Catedral
        weth: {
          tokens: [tokens.weth.address, tokenOut.address],
          fees: [FeeAmount.HIGH],
        },
        wbtc: {
          tokens: [tokens.wbtc.address, tokenOut.address],
          fees: [FeeAmount.HIGH],
        },
      };
