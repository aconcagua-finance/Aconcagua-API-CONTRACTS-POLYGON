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

const chainId =
  PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON : SupportedChainId.POLYGON_MUMBAI;

const swapOptions = {
  recipient: ContractTypes.BASE_ADDRESS,
  slippageTolerance: new Percent(5, 1000), // 0.5% for polygon (ASK)
  deadline: Math.floor(Date.now() / 1000 + 1800),
  type: SwapType.SWAP_ROUTER_02, // Ver Universal Router
};

const quoteAmounts = {
  weth: 10,
  wbtc: 5,
};

const weth = new Token(chainId, WETH_TOKEN_ADDRESS, 18, 'weth', 'Wrapped Ethereum');
const wbtc = new Token(chainId, WBTC_TOKEN_ADDRESS, 8, 'wbtc', 'Wrapped Bitcoin');
const usdc = new Token(chainId, USDC_TOKEN_ADDRESS, 6, 'usdc', 'USD Coin');
const usdt = new Token(chainId, USDT_TOKEN_ADDRESS, 6, 'usdt', 'USD Tether');

export const uniswapConfig = {
  chainId,
  swapOptions,
  quoteAmounts,
  tokens: { weth, wbtc },
  stableCoins: { usdc, usdt },
};
