import { CustomError, Types } from "../vs-core";
import { CurrencyTypes } from "../vs-core/types/currencyTypes";

/* eslint-disable operator-linebreak */
import { Token, SupportedChainId, Percent } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import { SwapType } from '@uniswap/smart-order-router';
import { ContractTypes } from '../types/contractTypes';
import { PROVIDER_NETWORK_NAME, USDC_TOKEN_ADDRESS, USDT_TOKEN_ADDRESS, USDM_TOKEN_ADDRESS, WBTC_TOKEN_ADDRESS } from './appConfig';

export const CurrencyDecimals = new Map([
  [CurrencyTypes.USDC, PROVIDER_NETWORK_NAME === 'rsk' ? 18 : 6],
  [CurrencyTypes.USDT, PROVIDER_NETWORK_NAME === 'rsk' ? 18 : 6],
  [CurrencyTypes.USDM, 18],
  [CurrencyTypes.WBTC, PROVIDER_NETWORK_NAME === 'rsk' ? 18 : 8],
]);


export const getTokenReference = (token: Types.CurrencyTypes): string => {
  if (!token) {
    throw new CustomError.TechnicalError(
      'ERROR_INVALID_TOKEN',
      null,
      'No token provided',
      null
    );;
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


export const chainId =
  PROVIDER_NETWORK_NAME === 'matic' ? SupportedChainId.POLYGON 
    // : PROVIDER_NETWORK_NAME === 'rsk' ? SupportedChainId.RSK 
    : SupportedChainId.SEPOLIA;

export const swapOptions = {
  recipient: ContractTypes.EMPTY_ADDRESS, // Can be replaced with vault's
  slippageTolerance:
    PROVIDER_NETWORK_NAME === 'matic' ? new Percent(5, 1000) 
      : PROVIDER_NETWORK_NAME === 'rsk' ? new Percent(5, 1000)
      : new Percent(10, 100), // 0.5% for Polygon; 10% for Sepolia
  deadline: () => Math.floor(Date.now() / 1000 + 60 * 10), // 10 min it's a function so we calculate the date every time.
  type: SwapType.SWAP_ROUTER_02, // Ver Universal Router
};

// Default quotes
export const quoteAmounts = {
  weth: 10,
  wbtc: 2,
};

// Supported tokens
export const tokens = {
  wbtc: new Token(chainId, WBTC_TOKEN_ADDRESS, CurrencyDecimals.get(CurrencyTypes.WBTC), 'wbtc', 'Wrapped Bitcoin'),
};

export const stableCoins = {
  usdc: new Token(chainId, USDC_TOKEN_ADDRESS, CurrencyDecimals.get(CurrencyTypes.USDC), 'usdc', 'USD Coin'),
  usdt: new Token(chainId, USDT_TOKEN_ADDRESS, CurrencyDecimals.get(CurrencyTypes.USDT), 'usdt', 'USD Tether'),
  usdm: new Token(chainId, USDM_TOKEN_ADDRESS, CurrencyDecimals.get(CurrencyTypes.USDM), 'usdm', 'USD Mountain'),
};

// TokenOut: quotations and swaps depending on paths relies on.
export const tokenOut = PROVIDER_NETWORK_NAME == 'rsk' ? stableCoins.usdt : stableCoins.usdc;

export const staticPaths =
  PROVIDER_NETWORK_NAME === 'matic'
    ? {
        // Prod
        wbtc: {
          tokens: [tokens.wbtc.address, tokenOut.address],
          fees: [FeeAmount.LOW, FeeAmount.LOW],
        },
      }
    : PROVIDER_NETWORK_NAME === 'rsk'
    ? {
      // RSK
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
