const { getTokensQuotes, getPathQuotes } = require('./controller');

const { Audit } = require('../../vs-core-firebase');
// const { Auth } = require('../../vs-core-firebase');
// const { Types } = require('../../vs-core');

exports.marketRoutesConfig = function (app) {
  // Busca las cotizaciones de los tokens disponibles.
  app.get('/tokensQuotes', [
    Audit.logger,
    // Auth.isAuthenticated(),  // TODO: not public.
    // Auth.isAuthorized({}),
    getTokensQuotes,
  ]);

  app.get('/pathQuotes/:quoteAmounts', [
    Audit.logger,
    // Auth.isAuthenticated(),  // TODO: not public.
    // Auth.isAuthorized({}),
    getPathQuotes,
  ]);
};
