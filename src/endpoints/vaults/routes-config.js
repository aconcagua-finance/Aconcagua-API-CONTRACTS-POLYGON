const {
  find,
  get,
  create,
  createVaultAdmin,
  patch,
  remove,
  findByUser,
  findByCompany,
  evaluate,
  getVaultBalances,
  withdraw,
  rescue,
  findVaultsLimitsByCompany,
  findVaultsLimitsByUser,
  createSafeAccount,
  amountToConversions,
} = require('./controller');

const { Audit } = require('../../vs-core-firebase');
const { Auth } = require('../../vs-core-firebase');
const { Types } = require('../../vs-core');

exports.vaultsRoutesConfig = function (app) {
  // busca un documento por ID, el userId es para validacion de permisos
  app.get('/by-user/:userId/:id', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowStaffRelationship: true,
      allowSameUser: true,
    }),
    get,
  ]);

  // busca un documento por ID, el companyId es para validacion de permisos
  app.get('/by-company/:companyId/:id', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowStaffRelationship: true,
      isEnterpriseEmployee: true,
    }),
    get,
  ]);

  // busca los elementos asociados a una company
  app.get('/by-company/:companyId', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      isEnterpriseEmployee: true,
    }),
    findByCompany,
  ]);

  // busca los documentos asociados a un usuario
  app.get('/by-user/:userId', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowSameUser: true,
      allowStaffRelationship: true,
    }),
    findByUser,
  ]);

  // evalúa los balances de tokens volátiles de las vaults
  app.get('/evaluate', [
    Audit.logger,
    /*
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowSameUser: true,
      allowStaffRelationship: true,
    }),
    */
    evaluate,
  ]);

  // consulta los saldos
  app.get('/:companyId/:userId/:id/balances', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowSameUser: true,
      isEnterpriseEmployee: true,
    }),
    getVaultBalances,
  ]);

  // consulta las conversiones de el monto y moneda enviada a usd y target token recibido (se usa al momento de aprobar una liquidacion/rescate)
  app.post('/amount-to-conversions', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
    }),
    amountToConversions,
  ]);

  // busca los documentos por filtros
  app.get('/', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({ hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER] }),
    find,
  ]);

  // busca los límites de las bóvedas asociadas a una company
  app.get('/vaultsLimits/by-company/:companyId', [
    Audit.logger,

    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      isEnterpriseEmployee: true,
    }),

    findVaultsLimitsByCompany,
  ]);

  // busca los límites de las bóvedas asociadas a un usuario
  app.get('/vaultsLimits/by-user/:userId', [
    Audit.logger,

    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER],
      allowSameUser: true,
      allowStaffRelationship: true,
    }),

    findVaultsLimitsByUser,
  ]);

  // deploy de ProxyAdmin para ser asociado a una companía en creación
  app.post('/vaultAdmin', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN],
    }),
    createVaultAdmin, // función que recibe safeLiq1 (owner de Polygon) y safeLiq3 (owner de Rootstock)
  ]);

  app.post('/:companyId/:userId/:id/withdraw', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN],
    }),
    withdraw,
  ]);

  app.post('/:companyId/:userId/:id/rescue', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN],
      allowSameUser: true,
    }),
    rescue,
  ]);

  // crea un documento, lo relaciona al usuario y a la empresa
  app.post('/:companyId/:userId', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({
      hasAppRole: [Types.AppRols.APP_ADMIN],
      allowStaffRelationship: true,
      isEnterpriseEmployee: true,
    }),
    create,
  ]);

  // Deploya un contrato Safe en Mumbai
  app.post('/createSafeAccount', [Audit.logger, createSafeAccount]);

  // update un documento, el companyId / userId es para validacion de permisos
  app.patch('/:companyId/:userId/:id', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({ hasAppRole: [Types.AppRols.APP_ADMIN], isEnterpriseEmployee: true }),
    patch,
  ]);

  // borra un documento, el companyId / userId es para validacion de permisos
  app.delete('/:companyId/:userId/:id', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({ hasAppRole: [Types.AppRols.APP_ADMIN] }),
    remove,
  ]);
};
