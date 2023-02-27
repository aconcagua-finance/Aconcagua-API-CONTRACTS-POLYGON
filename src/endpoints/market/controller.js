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
const { CoingeckoTypes } = require('../../types/coingeckoTypes');
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
} = require('../../config/appConfig');

const getUniswapQuotes = async () => {
  try {
    const quotes = {};

    // Provider
    const provider = new hre.ethers.providers.AlchemyProvider(
      PROVIDER_NETWORK_NAME,
      ALCHEMY_API_KEY
    );

    // Router Instance
    const router = new AlphaRouter({
      chainId,
      provider,
    });

    // Setup data
    const tokenOut = stableCoins.usdc;
    const tokensSymbols = Object.keys(tokens);

    for (const symbol of tokensSymbols) {
      const tokenIn = tokens[symbol];
      const quoteAmount = quoteAmounts[tokenIn.symbol];
      const wei = Utils.parseUnits(quoteAmount.toString(), tokenIn.decimals);
      const inputAmount = CurrencyAmount.fromRawAmount(tokenIn, JSBI.BigInt(wei)); // Ver si se puede sin la librería

      // Get Quote
      const route = await router.route(inputAmount, tokenOut, TradeType.EXACT_INPUT, swapOptions);

      console.log(
        `Uniswap Quote for pair ${tokenIn.symbol}/${tokenOut.symbol}: ${(
          route.quote.toFixed(2) / quoteAmount
        ).toFixed(2)}`
      );

      quotes[symbol] = (route.quote.toFixed(2) / quoteAmount).toFixed(2);
    }
    return quotes;
  } catch (err) {
    return err;
  }
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
          'ERROR_COINGECKO_QUOTE_INVALID_RESPONSE',
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

// const getBinanceQuotes = async () => {};

exports.getTokensQuotes = async function (req, res) {
  try {
    // Promise all or something?
    // const uniswapQuotes = await getUniswapQuotes();
    const coingeckoQuotes = await getCoingeckoQuotes();
    // const binanceQuotes = await getBinanceQuotes();

    // Validar quotes: Aconcagua logic

    // Return temporario
    const quotes = { ...coingeckoQuotes };

    return res.status(200).send({ quotes });
  } catch (err) {
    const parsedErr = getParsedEthersError(err);

    console.error('ERROR:', JSON.stringify(parsedErr));

    if (parsedErr && parsedErr.context) {
      return ErrorHelper.handleError(
        req,
        res,
        new Error(parsedErr.code + ' - ' + parsedErr.context)
      );
    }
    return ErrorHelper.handleError(req, res, err);
  }
};
