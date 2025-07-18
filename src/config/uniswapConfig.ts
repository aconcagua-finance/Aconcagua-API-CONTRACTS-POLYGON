import { CustomError, Types } from '../vs-core';
import { CurrencyTypes } from '../vs-core/types/currencyTypes';
import { networkTypes } from '../types/networkTypes';

/* eslint-disable operator-linebreak */
import { Token, SupportedChainId, Percent } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import { SwapType } from '@uniswap/smart-order-router';
import { ContractTypes } from '../types/contractTypes';
import { getEnvVariable, networkEquivalences } from '../vs-core-firebase/helpers/envGetter';

export const UNISWAP_NETWORK_FOR_QUOTES = networkTypes.NETWORK_TYPE_POLYGON;

export const CurrencyDecimalsRootstock = new Map([
  [CurrencyTypes.USDC, 18],
  [CurrencyTypes.USDT, 18],
  [CurrencyTypes.USDM, 18],
  [CurrencyTypes.WBTC, 18],
  [CurrencyTypes.WETH, 18],
]);

export const CurrencyDecimalsPolygon = new Map([
  [CurrencyTypes.USDC, 6],
  [CurrencyTypes.USDT, 6],
  [CurrencyTypes.USDM, 18],
  [CurrencyTypes.WBTC, 8],
  [CurrencyTypes.WETH, 18],
]);

/* Custom enum for additional chains */
export enum customSupportedChainId {
  ROOTSTOCK = 30,
  ROOTSTOCKTESTNET = 31,
}

export const getCurrencyDecimalsMap = (networkName) => {
  const networkNameUpperCase = networkName.toUpperCase();

  // Buscar la equivalencia de la red si existe
  const equivalentNetwork = networkEquivalences[networkNameUpperCase] || networkNameUpperCase;

  if (equivalentNetwork === networkTypes.NETWORK_TYPE_ROOTSTOCK) {
    return CurrencyDecimalsRootstock;
  } else if (equivalentNetwork === networkTypes.NETWORK_TYPE_POLYGON) {
    return CurrencyDecimalsPolygon;
  }

  throw new Error(`Unsupported network: ${networkName}`);
};

export const getTokenReference = (token: Types.CurrencyTypes): string => {
  if (!token) {
    throw new CustomError.TechnicalError('ERROR_INVALID_TOKEN', null, 'No token provided', null);
  } else {
    switch (token) {
      case Types.CurrencyTypes.USDC:
        return 'USDC';
      case Types.CurrencyTypes.USDT:
        return 'USDT';
      case Types.CurrencyTypes.USDM:
        return 'USDM';
      case Types.CurrencyTypes.WBTC:
        return 'WBTC';
      case Types.CurrencyTypes.WETH:
        return 'WETH';
      default:
        throw new CustomError.TechnicalError(
          'ERROR_INVALID_TOKEN',
          null,
          'Invalid token: ' + token,
          null
        );
    }
  }
};

// Función para obtener el chainId según la red actual
export const getChainId = (networkName: string): number => {
  const networkNameUpperCase = networkName.toUpperCase();

  // Try to find the chain ID in SupportedChainId
  if (SupportedChainId[networkNameUpperCase as keyof typeof SupportedChainId] !== undefined) {
    return SupportedChainId[networkNameUpperCase as keyof typeof SupportedChainId];
  }

  // Try to find the chain ID in customSupportedChainId
  if (
    customSupportedChainId[networkNameUpperCase as keyof typeof customSupportedChainId] !==
    undefined
  ) {
    return customSupportedChainId[networkNameUpperCase as keyof typeof customSupportedChainId];
  }

  // Throw an error if the chain is not supported
  throw new Error(`Unsupported chain ID: ${networkName}`);
};

// Función para obtener la configuración de swapOptions según la red
export const getSwapOptions = (networkName = UNISWAP_NETWORK_FOR_QUOTES) => ({
  recipient: ContractTypes.EMPTY_ADDRESS,
  slippageTolerance:
    networkName === networkTypes.NETWORK_TYPE_POLYGON
      ? new Percent(5, 1000) // 0.5% para Polygon
      : networkName === networkTypes.NETWORK_TYPE_ROOTSTOCK
      ? new Percent(5, 1000) // 0.5% para Rootstock
      : new Percent(10, 100), // 10% para Sepolia (o la red de prueba)
  deadline: () => Math.floor(Date.now() / 1000 + 60 * 10), // 10 minutos
  type: SwapType.SWAP_ROUTER_02,
});

// Default quotes
export const quoteAmounts = {
  wbtc: 2,
  weth: 2,
  pol: 2,
};

// Función para obtener las direcciones de los tokens de forma asíncrona
export const getTokenAddress = async (tokenName, networkName) => {
  return await getEnvVariable(`${tokenName}_TOKEN_ADDRESS`, networkName);
};

export const getRouterV3 = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  return getEnvVariable('SWAP_ROUTER_V3_ADDRESS', networkName);
};

export const getQuoterV2 = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  return getEnvVariable('UNISWAP_QUOTERV2_ADDRESS', networkName);
};

export const getUniswapURL = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  return getEnvVariable('HARDHAT_API_URL', networkName);
};

// Función para obtener los tokens soportados según la red
export const getTokens = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  const chainId = getChainId(networkName);
  const currencyDecimals = getCurrencyDecimalsMap(networkName);

  return {
    wbtc: new Token(
      chainId,
      await getTokenAddress('WBTC', networkName),
      currencyDecimals.get(CurrencyTypes.WBTC),
      'wbtc',
      'Wrapped Bitcoin'
    ),
    weth: new Token(
      chainId,
      await getTokenAddress('WETH', networkName),
      18,
      'weth',
      'Wrapped Ether'
    ),
  };
};

// Función para obtener las stablecoins según la red
export const getStableCoins = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  const chainId = getChainId(networkName);
  const currencyDecimals = getCurrencyDecimalsMap(networkName);

  return {
    usdc: new Token(
      chainId,
      await getTokenAddress('USDC', networkName),
      currencyDecimals.get(CurrencyTypes.USDC),
      'usdc',
      'USD Coin'
    ),
    usdt: new Token(
      chainId,
      await getTokenAddress('USDT', networkName),
      currencyDecimals.get(CurrencyTypes.USDT),
      'usdt',
      'USD Tether'
    ),
    usdm: new Token(
      chainId,
      await getTokenAddress('USDM', networkName),
      currencyDecimals.get(CurrencyTypes.USDM),
      'usdm',
      'USD Mountain'
    ),
  };
};

// Función para obtener el tokenOut según la red
export const getTokenOut = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  const stableCoins = await getStableCoins(networkName);
  return networkName.toUpperCase() === networkTypes.NETWORK_TYPE_ROOTSTOCK
    ? stableCoins.usdt
    : stableCoins.usdc;
};

// Función para obtener staticPaths según la red
export const getStaticPaths = async (networkName = UNISWAP_NETWORK_FOR_QUOTES) => {
  const tokens = await getTokens(networkName);
  const tokenOut = await getTokenOut(networkName);

  if (networkName === networkTypes.NETWORK_TYPE_POLYGON) {
    return {
      wbtc: {
        tokens: [tokens.wbtc.address, tokens.weth.address, tokenOut.address],
        fees: [FeeAmount.LOW, FeeAmount.LOW],
      },
      weth: {
        tokens: [tokens.weth.address, tokenOut.address],
        fees: [FeeAmount.LOW],
      },
    };
  } else if (networkName === networkTypes.NETWORK_TYPE_ROOTSTOCK) {
    return {
      wbtc: {
        tokens: [tokens.wbtc.address, tokenOut.address],
        fees: [FeeAmount.LOW],
      },
      weth: {
        tokens: [tokens.wbtc.address, tokenOut.address],
        fees: [FeeAmount.LOW],
      },
    };
  }
  return {
    wbtc: {
      tokens: [tokens.wbtc.address, tokenOut.address],
      fees: [FeeAmount.LOW],
    },
    weth: {
      tokens: [tokens.weth.address, tokenOut.address],
      fees: [FeeAmount.LOW],
    },
  };
};
