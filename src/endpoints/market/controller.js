const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const { AlphaRouter, SwapType } = require('@uniswap/smart-order-router');
const { SupportedChainId, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const hre = require('hardhat');
const axios = require('axios');
const JSBI = require('jsbi');

// eslint-disable-next-line camelcase
const { invoke_get_api } = require('../../helpers/httpInvoker');
const { ErrorHelper, LoggerHelper } = require('../../vs-core-firebase');
const { CustomError } = require('../../vs-core');
const { getParsedEthersError } = require('../vaults/errorParser');
const { BinanceTypes, CoingeckoTypes, TokenTypes } = require('../../types/index');
const {
  chainId,
  swapOptions,
  quoteAmounts,
  tokens,
  stableCoins,
} = require('../../config/uniswapConfig');
const {
  find,
  get,
  patch,
  remove,
  create,
  createInner,
  fetchSingleItem,
  updateSingleItem,
  fetchItemsByIds,
  sanitizeData,
  createFirestoreDocument,
  findWithRelationship,
  getWithRelationshipById,
  MULTIPLE_RELATIONSHIP_SUFFIX,

  findWithUserRelationship,
  getWithUserRelationshipById,
  listByProp,
  getByProp,
  listByPropInner,
  secureArgsValidation,
  secureDataArgsValidation,
  fetchItems,
} = require('../baseEndpoint');
const {
  WALLET_PRIVATE_KEY,
  WALLET_ADDRESS,
  ALCHEMY_API_KEY,
  PROVIDER_NETWORK_NAME,
  COINGECKO_URL,
  BINANCE_URL,
} = require('../../config/appConfig');
const { unix } = require('moment');

const getUniswapQuotes = async () => {
  const quotes = {};

  // Provider
  const provider = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);

  // Router Instance
  const router = new AlphaRouter({
    chainId,
    provider,
  });

  // Setup data
  const tokenOut = stableCoins.usd;
  const tokensSymbols = Object.keys(tokens);

  for (const symbol of tokensSymbols) {
    const tokenIn = tokens[symbol];
    const quoteAmount = quoteAmounts[tokenIn.symbol];
    const wei = Utils.parseUnits(quoteAmount.toString(), tokenIn.decimals);
    const inputAmount = CurrencyAmount.fromRawAmount(tokenIn, JSBI.BigInt(wei));

    // Get Quote
    const route = await router.route(inputAmount, tokenOut, TradeType.EXACT_INPUT, swapOptions);

    console.log(
      `Uniswap Quote for pair ${tokenIn.symbol}/${tokenOut.symbol}: ${(
        route.quote.toFixed(2) / quoteAmount
      ).toFixed(2)}`
    );

    quotes[symbol] = Number((route.quote.toFixed(2) / quoteAmount).toFixed(2));
  }
  return quotes;
};

const getCoingeckoQuotes = async () => {
  const quotes = {};

  for (const token in CoingeckoTypes) {
    if (Object.prototype.hasOwnProperty.call(CoingeckoTypes, token)) {
      const type = CoingeckoTypes[token];

      const apiResponse = await invoke_get_api({
        endpoint: `${COINGECKO_URL}/simple/price?ids=${type}&vs_currencies=usd`,
      });
      if (!apiResponse.data[type]) {
        throw new CustomError.TechnicalError(
          'ERROR_COINGECKO_QUOTES_INVALID_RESPONSE',
          null,
          `Respuesta inválida del servicio de valuacion Coingecko para moneda ${type}`,
          null
        );
      }

      const valuation = apiResponse.data[type].usd;
      const symbol = token.toLowerCase();
      quotes[symbol] = valuation;
    }
  }

  return quotes;
};

const getBinanceQuotes = async () => {
  const apiResponse = await invoke_get_api({
    endpoint: `${BINANCE_URL}/ticker/price`,
  });
  if (!apiResponse || !apiResponse.data || apiResponse.data.length == 0) {
    throw new CustomError.TechnicalError(
      'ERROR_BINANCE_QUOTES_INVALID_RESPONSE',
      null,
      `Respuesta inválida del servicio de valuacion Binance`,
      null
    );
  }

  const quotes = {};
  for (const token in BinanceTypes) {
    if (Object.prototype.hasOwnProperty.call(BinanceTypes, token)) {
      const symbol = token.toLowerCase();
      const pair = BinanceTypes[token];
      const quote = apiResponse.data.find((ticker) => ticker.symbol === pair);
      quotes[symbol] = Number(quote.price);
    }
  }

  return quotes;
};

exports.getTokensQuotes = async function (req, res) {
  try {
    const DIFF_THRESHOLD = -2; // Parametrizar?

    // Call quotations and store them.
    const providers = ['Uniswap', 'Coingecko', 'Binance'];
    const quotations = [getUniswapQuotes(), getCoingeckoQuotes(), getBinanceQuotes()];
    const [uniswapQuotes, coingeckoQuotes, binanceQuotes] = await Promise.allSettled(
      quotations
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const error = `Error fetching quotes from ${providers[index]} provider: `;
          console.error(`${error}${result.reason.message}`);
          if (index === 0) {
            // If UniswapQuotes fails then stop execution and throw error.
            result.reason.message = `${error}${result.reason.message}`;
            throw result.reason;
          }
        }
      });
      return results.map((result) => result.value);
    });

    // Si la diferencia entre Uniswap y centralizados supera el umbral para algún token entonces notificar.
    for (const token in TokenTypes) {
      if (Object.prototype.hasOwnProperty.call(TokenTypes, token)) {
        const symbol = TokenTypes[token];
        let uniXBinance;
        let uniXCoingecko;
        if (binanceQuotes) {
          uniXBinance = uniswapQuotes[symbol] / binanceQuotes[symbol] - 1 * 100;
        }
        if (coingeckoQuotes) {
          uniXCoingecko = uniswapQuotes[symbol] / coingeckoQuotes[symbol] - 1 * 100;
        }

        if (!uniXBinance || uniXBinance <= DIFF_THRESHOLD) {
          if (!uniXCoingecko || uniXCoingecko <= DIFF_THRESHOLD) {
            console.log(
              `Differencia entre cotizaciones Uniswap y centralizadas supera el umbral para token ${token}.
                \nUniswap: ${uniswapQuotes[symbol]}
                \nBinance: ${binanceQuotes[symbol]} - ${uniXBinance}% diff
                \nCoingecko: ${coingeckoQuotes[symbol]} - ${uniXCoingecko}% diff`
            );
            // Mandar mail
          }
        }
      }
    }

    return res.status(200).send(uniswapQuotes);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};
