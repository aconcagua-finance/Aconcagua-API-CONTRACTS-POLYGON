const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const { AlphaRouter, SwapType } = require('@uniswap/smart-order-router');
const { SupportedChainId, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const hre = require('hardhat');
const axios = require('axios');
const JSBI = require('jsbi');

const { ErrorHelper, LoggerHelper } = require('../../vs-core-firebase');
const { CustomError } = require('../../vs-core');
const { getParsedEthersError } = require('../vaults/errorParser');
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
} = require('../../config/appConfig');

const getUniswapQuotes = async () => {
  try {
    const quotes = {};
    debugger;

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

      // Usar logger?
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

// const getCentralizedQuotes = async () => {};

exports.getTokensQuotes = async function (req, res) {
  try {
    const uniswapQuotes = await getUniswapQuotes();
    debugger;
    console.log(uniswapQuotes);

    const quotes = { ...uniswapQuotes };

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
