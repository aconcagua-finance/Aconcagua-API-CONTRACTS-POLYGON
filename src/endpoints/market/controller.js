/* eslint-disable operator-linebreak */
const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const { AlphaRouter, SwapType } = require('@uniswap/smart-order-router');
const { SupportedChainId, CurrencyAmount, TradeType, Percent } = require('@uniswap/sdk-core');
const hre = require('hardhat');
const axios = require('axios');
const JSBI = require('jsbi');

// eslint-disable-next-line camelcase
const { invoke_get_api } = require('../../helpers/httpInvoker');
const { ErrorHelper, LoggerHelper, EmailSender } = require('../../vs-core-firebase');
const { CustomError } = require('../../vs-core');
const { getParsedEthersError } = require('../vaults/errorParser');
const { BinanceTypes, CoingeckoTypes, TokenTypes } = require('../../types/index');
const { Collections } = require('../../types/collectionsTypes');
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
  filterItems,
} = require('../baseEndpoint');
const {
  WALLET_PRIVATE_KEY,
  WALLET_ADDRESS,
  ALCHEMY_API_KEY,
  PROVIDER_NETWORK_NAME,
  COINGECKO_URL,
  BINANCE_URL,
} = require('../../config/appConfig');

const getUniswapQuotes = async () => {
  // TODO: Refactor config file for market provider name
  const provider = 'uniswap';
  const quotes = {};

  // Provider
  const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);
  // Router Instance
  const router = new AlphaRouter({
    chainId,
    provider: alchemy,
  });
  // Setup data
  const tokenOut = stableCoins.usdc;
  const tokensSymbols = Object.keys(tokens);

  for (const symbol of tokensSymbols) {
    // Setup token data
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

  const result = {
    provider,
    quotes,
  };
  return result;
};

const getCoingeckoQuotes = async () => {
  // TODO: Refactor config file
  const provider = 'coingecko';
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

  const result = {
    provider,
    quotes,
  };
  return result;
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

  // TODO: Refactor config file
  const provider = 'binance';
  const quotes = {};
  for (const token in BinanceTypes) {
    if (Object.prototype.hasOwnProperty.call(BinanceTypes, token)) {
      const symbol = token.toLowerCase();
      const pair = BinanceTypes[token];
      const quote = apiResponse.data.find((ticker) => ticker.symbol === pair);
      quotes[symbol] = Number(quote.price);
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

const getQuotations = async () => {
  // TODO: Refactor config file
  const providers = [
    { name: 'Uniswap', getQuotes: getUniswapQuotes },
    { name: 'Coingecko', getQuotes: getCoingeckoQuotes },
    { name: 'Binance', getQuotes: getBinanceQuotes },
  ];
  const quoters = providers.map((provider) => provider.getQuotes());

  const quotations = await Promise.allSettled(quoters).then((results) => {
    results.forEach((result, index) => {
      // Logueo consultas fallidas
      if (result.status === 'rejected') {
        const error = `Error fetching quotes from ${providers[index].name} provider: `;
        console.error(`${error}${result.reason.message}`);

        // Si Uniswap falla entonces detengo la ejecución y tiro error (no se actualizará la cotización)
        if (index === 0) {
          result.reason.message = `${error}${result.reason.message}`;
          throw result.reason;
        }
      }
    });
    return results.map((result) => result.value);
  });

  return parseQuotations(quotations);
};

const sendNotificationsEmails = async (emailMsgs) => {
  // Si hay mails se mandan a todos los admins
  if (emailMsgs.length > 0) {
    // Preparo query
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
  const { uniswap: uniswapQuotes, binance: binanceQuotes, coingecko: coingeckoQuotes } = quotations;
  const emailMsgs = [];
  // Si hay al menos una fuente centralizada se evalua
  if (coingeckoQuotes || binanceQuotes) {
    const DIFF_THRESHOLD_PERCENT = -2; // TODO: Refactor config file

    for (const token in TokenTypes) {
      if (Object.prototype.hasOwnProperty.call(TokenTypes, token)) {
        const symbol = TokenTypes[token];

        // Calculo las diferencias entre Uniswap y las centralizadas.
        const uniXBinanceDiffPercent = binanceQuotes
          ? (uniswapQuotes[symbol] / binanceQuotes[symbol] - 1).toFixed(3) * 100
          : null;
        const uniXCoingeckoDiffPercent = coingeckoQuotes
          ? (uniswapQuotes[symbol] / coingeckoQuotes[symbol] - 1).toFixed(3) * 100
          : null;

        // Si la diferencia porcentual entre las cotizaciones Uniswap y centralizados supera el umbral para algún token entonces armo msg de mail.
        if (uniXBinanceDiffPercent == null || uniXBinanceDiffPercent <= DIFF_THRESHOLD_PERCENT) {
          if (
            uniXCoingeckoDiffPercent == null ||
            uniXCoingeckoDiffPercent <= DIFF_THRESHOLD_PERCENT
          ) {
            const msg = `Differencia entre cotizaciones Uniswap y centralizadas supera el umbral para token: ${token}.\nUmbral: ${DIFF_THRESHOLD_PERCENT}%\nUniswap: $${
              uniswapQuotes[symbol]
            }\n${
              uniXBinanceDiffPercent
                ? `Binance: $${binanceQuotes[symbol]}, ${uniXBinanceDiffPercent}% diff`
                : null
            }\n${
              uniXCoingeckoDiffPercent
                ? `Coingecko: $${coingeckoQuotes[symbol]}, ${uniXCoingeckoDiffPercent}% diff`
                : null
            }`;
            console.log(msg);
            emailMsgs.push({
              subject: 'Alerta: Cotizaciones tokens - Diferencia entre Uniswap y Centralizadas',
              msg,
            });
          }
        }
      }
    }
  } else {
    // Si no se pudo evaluar porque fallaron las consultas centralizadas armo mensaje mail.
    const msg = `No se logró evaluar las cotizaciones Uniswap: no se obtuvieron las cotizaciones centralizadas.\nCotización Uniswap: ${uniswapQuotes}`;
    console.log(msg);
    emailMsgs.push({
      subject: 'Alerta: Cotizaciones tokens - Cotizaciones centralizadas faltantes',
      msg,
    });
  }

  // Si hay mensajes para mandar mails entonces notifico.
  if (emailMsgs && emailMsgs.length > 0) sendNotificationsEmails(emailMsgs);
};

exports.getTokensQuotes = async function (req, res) {
  try {
    // Consulto las cotizaciones
    const quotations = await getQuotations();

    // Mock pre marketCap apuntando a prod
    if (PROVIDER_NETWORK_NAME === 'maticmum') {
      quotations.uniswap = { ...quotations.binance };
    }

    // Evaluo las cotizaciones y notifico.
    await evaluateQuotations(quotations);

    return res.status(200).send(quotations.uniswap);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};
