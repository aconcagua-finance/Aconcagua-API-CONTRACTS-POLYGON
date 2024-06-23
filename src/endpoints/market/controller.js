/* eslint-disable operator-linebreak */
const { Alchemy, Network, Utils } = require('alchemy-sdk');
const { AlphaRouter, SwapType } = require('@uniswap/smart-order-router');
const { SupportedChainId, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const {
  abi: Quoter2ABI,
} = require('@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json');
const hre = require('hardhat');
const axios = require('axios');
const JSBI = require('jsbi');

// eslint-disable-next-line camelcase
const { invoke_get_api } = require('../../helpers/httpInvoker');
const { encodePath } = require('../../helpers/uniswapHelper');
const { ErrorHelper, LoggerHelper, EmailSender } = require('../../vs-core-firebase');
const { CustomError } = require('../../vs-core');
const { getParsedEthersError } = require('../vaults/errorParser');
const { KrakenTypes } = require('../../types/krakenTypes');
const { CoingeckoTypes } = require('../../types/coingeckoTypes');
const { TokenTypes } = require('../../types/tokenTypes');
const { Collections } = require('../../types/collectionsTypes');
const {
  chainId,
  swapOptions,
  quoteAmounts,
  tokens,
  tokenOut,
  stableCoins,
  staticPaths,
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
  filterItems,
} = require('../baseEndpoint');
const {
  ALCHEMY_API_KEY,
  HARDHAT_API_URL,
  PROVIDER_NETWORK_NAME,
  QUOTER_CONTRACT_ADDRESS,
  COINGECKO_URL,
  KRAKEN_URL,
} = require('../../config/appConfig');

const getUniswapQuotes = async (tokens) => {
  // TODO: Refactor config file for market provider name
  const provider = 'uniswap';

  // const quotes = await getUniSmartRouterQuotes(tokens);
  const quotes = await getUniPathQuotes(tokens);
  return {
    provider,
    quotes,
  };
};

const getUniSmartRouterQuotes = async (quoteAmounts) => {
  // Provider
  // const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);
  const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
  console.log('Preparo llamada quotes Uniswap desde smart router');

  // Router Instance
  const router = new AlphaRouter({
    chainId,
    provider: alchemy,
  });

  // Setup data
  const quotes = {};
  const tokensSymbols = Object.keys(quoteAmounts);

  for (const symbol of tokensSymbols) {
    // Setup token data
    const tokenIn = tokens[symbol];
    const quoteAmount = quoteAmounts[tokenIn.symbol];
    const wei = Utils.parseUnits(quoteAmount.toString(), tokenIn.decimals);
    const inputAmount = CurrencyAmount.fromRawAmount(tokenIn, JSBI.BigInt(wei));

    // Get Quote
    console.log(`Llamada quotes Uniswap smart router para token ${tokenIn.symbol}`);
    const route = await router.route(inputAmount, tokenOut, TradeType.EXACT_INPUT, swapOptions);
    const quotation = Number((route.quote.toFixed(2) / quoteAmount).toFixed(2));

    console.log(
      `Uniswap Quote for pair ${tokenIn.symbol}/${tokenOut.symbol}: ${(
        route.quote.toFixed(2) / quoteAmount
      ).toFixed(2)}`
    );

    quotes[symbol] = quotation;
  }
  return quotes;
};

const getUniPathQuotes = async (quoteAmounts) => {
  // Provider
  // const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);

  const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
  console.log('Preparo llamada quotes Uniswap desde quoter');

  const quoter2Contract = new hre.ethers.Contract(QUOTER_CONTRACT_ADDRESS, Quoter2ABI, alchemy);

  // Quote data
  const quotes = {};
  const tokensSymbols = Object.keys(quoteAmounts);

  for (const symbol of tokensSymbols) {
    const tokenIn = tokens[symbol];
    const encodedPath = encodePath(staticPaths[symbol].tokens, staticPaths[symbol].fees);
    console.log('staticPaths para ', symbol, ' es ', staticPaths[symbol]);
    console.log('encodedPath es ', encodedPath);
    const amountIn = Utils.parseUnits(quoteAmounts[symbol].toString(), tokenIn.decimals).toString();
    console.log('amountIn es ', Utils.formatUnits(amountIn, tokenIn.decimals));
    console.log(`Llamada quotes Uniswap Quoter para token ${symbol}`);
    const quoter2Result = await quoter2Contract.callStatic.quoteExactInput(encodedPath, amountIn);
    console.log('quoter2Result es ', quoter2Result);

    const amountOutFormatted = Utils.formatUnits(quoter2Result.amountOut, tokenOut.decimals);
    const quotation = (amountOutFormatted / Utils.formatUnits(amountIn, tokenIn.decimals)).toFixed(
      2
    );

    console.log(`Uniswap Quote for pair ${tokenIn.symbol}/${tokenOut.symbol}: ${quotation}`);

    quotes[symbol] = quotation;
  }
  return quotes;
};

exports.getPathQuotes = async function (req, res) {
  try {
    // Input validations
    const input = JSON.parse(req.params.quoteAmounts);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).send('Invalid input format: expected an object');
    }
    const suppTokens = tokens;
    const quoteAmounts = {};
    Object.entries(input).forEach(([token, amount]) => {
      if (suppTokens[token] && amount > 0) quoteAmounts[token] = amount;
    });
    if (!quoteAmounts) return res.status(400).send('No supported token has been provided');

    const quotes = await getUniPathQuotes(quoteAmounts);
    res.status(200).send(quotes);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const getCoingeckoQuotes = async (tokens) => {
  // TODO: Refactor config file
  const provider = 'coingecko';
  const quotes = {};
  console.log('Preparo llamadas quotes Coingecko');

  const tokensSymbols = Object.keys(tokens);

  for (const token of tokensSymbols) {
    const symbol = token.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(CoingeckoTypes, symbol)) {
      const type = CoingeckoTypes[symbol];

      const apiResponse = await invoke_get_api({
        endpoint: `${COINGECKO_URL}/simple/price?ids=${type}&vs_currencies=usd`,
      });

      console.log('Coingecko Quote apiResponse es ', apiResponse);

      if (!apiResponse.data[type]) {
        throw new CustomError.TechnicalError(
          'ERROR_COINGECKO_QUOTES_INVALID_RESPONSE',
          null,
          `Respuesta inválida del servicio de valuacion Coingecko para moneda ${symbol} - ${type}`,
          null
        );
      }

      const valuation = apiResponse.data[type].usd;
      quotes[token] = valuation;
      console.log(`Quote Coingecko para token ${symbol}: ${valuation}`);
    } else {
      console.log(`Token ${symbol} no posee configuración Coingecko para quotear.`);
    }
  }

  const result = {
    provider,
    quotes,
  };
  return result;
};

const getKrakenQuotes = async (tokens) => {
  console.log(`getKrakenQuotes LLamada quotes Kraken`);
  console.log(`getKrakenQuotes KRAKEN_URL es ${KRAKEN_URL}`);
  console.log('getKrakenQuotes tokens es ', tokens);

  // TODO: Refactor config file
  const provider = 'kraken';
  const quotes = {};

  const tokensSymbols = Object.keys(tokens);
  for (const token of tokensSymbols) {
    const symbol = token.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(KrakenTypes, symbol)) {
      const pair = KrakenTypes[symbol];
      // MRM Busco cada token

      const apiResponse = await invoke_get_api({
        endpoint: `${KRAKEN_URL}/Ticker?pair=${pair}`,
      });

      console.log('getKrakenQuotes Kraken Quote apiResponse es ', apiResponse);

      console.log(
        'getKrakenQuotes Kraken Quote apiResponse.data.result[pair].c[0] es ',
        apiResponse.data.result[pair].c[0]
      );

      if (!apiResponse || !apiResponse.data || apiResponse.data.length == 0) {
        throw new CustomError.TechnicalError(
          'ERROR_KRAKEN_QUOTES_INVALID_RESPONSE',
          null,
          `Respuesta inválida del servicio de valuacion Kraken para ${pair}`,
          null
        );
      }

      const quote = parseFloat(apiResponse.data.result[pair].c[0]);
      quotes[symbol] = Number(quote);

      console.log(`getKrakenQuotes Quote Kraken para token ${symbol}: ${quote}`);
    } else {
      console.log(`getKrakenQuotes Token ${symbol} no posee configuración Kraken para quotear.`);
    }
  }

  const result = {
    provider,
    quotes,
  };
  return result;
};

const parseQuotations = (quotes) => {
  return quotes.reduce((result, quote) => {
    result[quote.provider] = quote.quotes;
    return result;
  }, {});
};

const getQuotations = async (quoteAmounts) => {
  // TODO: Refactor config file
  const providers = [
    { name: 'Uniswap', getQuotes: getUniswapQuotes },
    { name: 'Coingecko', getQuotes: getCoingeckoQuotes },
    { name: 'Kraken', getQuotes: getKrakenQuotes },
  ];
  const quoters = providers.map((provider) => provider.getQuotes(quoteAmounts));

  console.log(`Ejecuto llamadas de cotización`);
  const quotations = await Promise.allSettled(quoters);

  // Logueo consultas fallidas
  quotations.forEach((result, index) => {
    if (result.status === 'rejected') {
      const error = `Error fetching quotes from ${providers[index].name} provider: `;
      console.error(`${error}${result.reason.message}`);
    }
  });

  console.log('Cotizaciones solicitadas exitosamente');
  const rawQuotations = quotations.map((result) => result.value).filter((obj) => obj);

  return parseQuotations(rawQuotations);
};

const sendNotificationsEmails = async (emailMsgs) => {
  // Si hay mails se mandan a todos los admins
  if (emailMsgs.length > 0) {
    // Preparo query
    console.log(`Consulto usuarios admins para notificación de valuaciones`);
    const limit = 1000;
    const offset = '0';
    const filters = {
      appRols: {
        $in: ['app-admin'],
      },
      state: {
        $contains: '1',
      },
    };

    // Consulto usuarios y filtro admins
    const items = await fetchItems({
      collectionName: Collections.USERS,
      limit,
      filters,
      indexedFilters: ['state'],
    });
    const admins = filterItems({ items, limit, offset, filters }).items;

    if (admins && admins.length > 0) {
      // Armo string con mails de destino y mando los mails.
      console.log(`Envio mail a admins de valuaciones`);
      const emails = admins.map((admin) => admin.email).join(', ');

      for (const email of emailMsgs) {
        EmailSender.send({
          to: emails,
          message: {
            subject: email.subject,
            html: null,
            text: email.msg,
          },
        });
      }
    }
  }
};

const evaluateQuotations = async (quotations) => {
  console.log('evaluateQuotations ');
  console.log(quotations);
  const { uniswap: uniswapQuotes, kraken: krakenQuotes, coingecko: coingeckoQuotes } = quotations;

  function isValidPrice(price) {
    return typeof price === 'number' && price > 0;
  }

  function averageValidPrices(prices) {
    const validPrices = prices.filter(isValidPrice);
    if (validPrices.length === 0) return NaN;
    return validPrices.reduce((acc, price) => acc + price, 0) / validPrices.length;
  }

  function processQuotes(symbol, quotations) {
    const sources = ['uniswap', 'coingecko', 'kraken'];
    const prices = sources.map((source) => {
      const quote = quotations[source];
      if (!quote) return NaN;
      const price = quote[symbol.toLowerCase()] || quote[symbol.toUpperCase()];
      return isValidPrice(price) ? price : NaN;
    });

    if (prices.every(isValidPrice)) {
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      if ((maxPrice - minPrice) / minPrice < 0.02) {
        return averageValidPrices(prices);
      }
    }

    const filteredPrices = prices.filter((price, index, arr) => {
      if (!isValidPrice(price)) return false;
      const otherPrices = arr.filter((_, i) => i !== index && isValidPrice(arr[i]));
      if (otherPrices.length < 2) return true;
      const [otherPrice1, otherPrice2] = otherPrices;
      return (
        Math.abs(price - otherPrice1) / otherPrice1 < 0.02 ||
        Math.abs(price - otherPrice2) / otherPrice2 < 0.02
      );
    });

    return averageValidPrices(filteredPrices);
  }

  const results = [
    ['wbtc', processQuotes('wbtc', quotations)],
    ['weth', processQuotes('weth', quotations)],
  ];
  console.log('evaluateQuotations - results');
  console.log(results);
  return results;
};

exports.getTokensQuotes = async function (req, res) {
  try {
    // Consulto las cotizaciones
    console.log('getTokenQuotes con quoteaAmounts ', quoteAmounts);
    const quotations = await getQuotations(quoteAmounts);

    // Evaluo las cotizaciones y notifico.
    const results = await evaluateQuotations(quotations);

    //  MRM Acá debo cambiar la lógica para que mande otra
    return res.status(200).send(results);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};
