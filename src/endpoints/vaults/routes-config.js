const {
  find,
  get,
  create,
  patch,
  remove,
  findByUser,
  findByCompany,
  setRescueAcount,
  getVaultBalances,
  withdraw,
  rescue,
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
    }),
    get,
  ]);

  // busca un documento por ID, el companyId es para validacion de permisos
  app.get('/by-commpany/:companyId/:id', [
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

  // busca los documentos por filtros
  app.get('/', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({ hasAppRole: [Types.AppRols.APP_ADMIN, Types.AppRols.APP_VIEWER] }),
    find,
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
    }),
    create,
  ]);

  // update un documento,  solo la prop asociada al rescue wallet account
  app.patch('/:companyId/:userId/:id/setRescueAcount', [
    Audit.logger,
    Auth.isAuthenticated,
    Auth.isAuthorized({ hasAppRole: [Types.AppRols.APP_ADMIN] }),
    setRescueAcount,
  ]);

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
