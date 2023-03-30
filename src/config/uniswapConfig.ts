const { Token, SupportedChainId, Percent } = require('@uniswap/sdk-core');
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
  PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON : SupportedChainId.POLYGON_MUMBAI;

export const swapOptions = {
  recipient: ContractTypes.EMPTY_ADDRESS,
  slippageTolerance: new Percent(5, 1000), // 0.5% for polygon (ASK)
  deadline: Math.floor(Date.now() / 1000 + 1800),
  type: SwapType.SWAP_ROUTER_02, // Ver Universal Router
};

export const quoteAmounts = {
  weth: 20,
  wbtc: 2,
};

export const tokens = {
  weth: new Token(chainId, WETH_TOKEN_ADDRESS, 18, 'weth', 'Wrapped Ethereum'),
  wbtc: new Token(chainId, WBTC_TOKEN_ADDRESS, 8, 'wbtc', 'Wrapped Bitcoin'),
};

export const stableCoins = {
  usdc: new Token(chainId, USDC_TOKEN_ADDRESS, 6, 'usdc', 'USD Coin'),
  usdt: new Token(chainId, USDT_TOKEN_ADDRESS, 6, 'usdt', 'USD Tether'),
};

export const staticPaths = {
  weth: {
    tokens: [tokens.weth.address, stableCoins.usdc.address],
    fees: [500],
  },
  wbtc: {
    tokens: [tokens.wbtc.address, tokens.weth.address, stableCoins.usdc.address],
    fees: [500, 500],
  },
};
