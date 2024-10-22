import { CustomError, Types } from '../vs-core';
import { CurrencyTypes } from '../vs-core/types/currencyTypes';
import { Token, SupportedChainId, Percent } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import { SwapType } from '@uniswap/smart-order-router';
import { ContractTypes } from '../types/contractTypes';
import { getEnvVariable } from '../vs-core-firebase/helpers/envGetter'; // Importar la función getEnvVariable

export const CurrencyDecimals = new Map<string, number>();

// Función asíncrona para inicializar las variables
export const initializeConfig = async () => {
  const PROVIDER_NETWORK_NAME = await getEnvVariable('PROVIDER_NETWORK_NAME');
  const USDC_TOKEN_ADDRESS = await getEnvVariable('USDC_TOKEN_ADDRESS');
  const USDT_TOKEN_ADDRESS = await getEnvVariable('USDT_TOKEN_ADDRESS');
  const USDM_TOKEN_ADDRESS = await getEnvVariable('USDM_TOKEN_ADDRESS');
  const WBTC_TOKEN_ADDRESS = await getEnvVariable('WBTC_TOKEN_ADDRESS');
  const WETH_TOKEN_ADDRESS = await getEnvVariable('WETH_TOKEN_ADDRESS');

  // Inicializar CurrencyDecimals con los valores correctos
  CurrencyDecimals.set(CurrencyTypes.USDC, PROVIDER_NETWORK_NAME === 'rootstock' ? 18 : 6);
  CurrencyDecimals.set(CurrencyTypes.USDT, PROVIDER_NETWORK_NAME === 'rootstock' ? 18 : 6);
  CurrencyDecimals.set(CurrencyTypes.USDM, 18);
  CurrencyDecimals.set(CurrencyTypes.WBTC, PROVIDER_NETWORK_NAME === 'rootstock' ? 18 : 8);
  CurrencyDecimals.set(CurrencyTypes.WETH, PROVIDER_NETWORK_NAME === 'rootstock' ? 18 : 18);

  const chainId =
    PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON : SupportedChainId.SEPOLIA;

  const swapOptions = {
    recipient: ContractTypes.EMPTY_ADDRESS, // Can be replaced with vault's
    slippageTolerance:
      PROVIDER_NETWORK_NAME === 'matic'
        ? new Percent(5, 1000)
        : PROVIDER_NETWORK_NAME === 'rootstock'
        ? new Percent(5, 1000)
        : new Percent(10, 100), // 0.5% for Polygon; 10% for Sepolia
    deadline: () => Math.floor(Date.now() / 1000 + 60 * 10), // 10 min, calculated each time.
    type: SwapType.SWAP_ROUTER_02, // Universal Router
  };

  // Supported tokens
  const tokens = {
    wbtc: new Token(
      chainId,
      WBTC_TOKEN_ADDRESS,
      CurrencyDecimals.get(CurrencyTypes.WBTC),
      'wbtc',
      'Wrapped Bitcoin'
    ),
    weth: new Token(chainId, WETH_TOKEN_ADDRESS, 18, 'weth', 'Wrapped Ether'),
  };

  const stableCoins = {
    usdc: new Token(
      chainId,
      USDC_TOKEN_ADDRESS,
      CurrencyDecimals.get(CurrencyTypes.USDC),
      'usdc',
      'USD Coin'
    ),
    usdt: new Token(
      chainId,
      USDT_TOKEN_ADDRESS,
      CurrencyDecimals.get(CurrencyTypes.USDT),
      'usdt',
      'USD Tether'
    ),
    usdm: new Token(
      chainId,
      USDM_TOKEN_ADDRESS,
      CurrencyDecimals.get(CurrencyTypes.USDM),
      'usdm',
      'USD Mountain'
    ),
  };

  // TokenOut: quotations and swaps depending on paths rely on this token.
  const tokenOut = PROVIDER_NETWORK_NAME === 'rootstock' ? stableCoins.usdt : stableCoins.usdc;

  const staticPaths =
    PROVIDER_NETWORK_NAME === 'matic'
      ? {
          // Polygon
          wbtc: {
            tokens: [tokens.wbtc.address, tokens.weth.address, tokenOut.address],
            fees: [FeeAmount.LOW, FeeAmount.LOW],
          },
          weth: {
            tokens: [tokens.weth.address, tokenOut.address],
            fees: [FeeAmount.LOW],
          },
        }
      : PROVIDER_NETWORK_NAME === 'rootstock'
      ? {
          // RSK
          wbtc: {
            tokens: [tokens.wbtc.address, tokenOut.address],
            fees: [FeeAmount.LOW],
          },
          weth: {
            tokens: [tokens.wbtc.address, tokenOut.address],
            fees: [FeeAmount.LOW],
          },
        }
      : {
          // Default to Sepolia
          wbtc: {
            tokens: [tokens.wbtc.address, tokenOut.address],
            fees: [FeeAmount.LOW],
          },
          weth: {
            tokens: [tokens.weth.address, tokenOut.address],
            fees: [FeeAmount.LOW],
          },
        };

  return {
    chainId,
    swapOptions,
    tokens,
    stableCoins,
    tokenOut,
    staticPaths,
  };
};
