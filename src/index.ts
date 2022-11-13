/* eslint-disable no-console */
// import { Config } from '@abdalamichel/vs-core';

import * as functions from 'firebase-functions';
import * as express from 'express';
import * as httpContext from 'express-http-context';
import * as cors from 'cors';

import * as admin from 'firebase-admin';
import { FirebaseConfig } from './config/firebaseConfig';

const { vaultsRoutesConfig } = require('./endpoints/vaults/routes-config');

const {
  cronFetchVaultsBalances,
  onVaultUpdate,
  onVaultCreate,
} = require('./endpoints/vaults/controller');

console.log('NODE_ENV:', process.env.NODE_ENV, 'ENVIRONMENT:', process.env.ENVIRONMENT);

admin.initializeApp(FirebaseConfig);

function addSpanId(req, res, next) {
  let spanId = req.headers.spanid;
  if (!spanId) spanId = Math.floor(Math.random() * 10000).toString();
  httpContext.set('span-id', spanId);
  next();
}

function onlyLocalLoadEnv(req, res, next) {
  // if (process.env.NODE_ENV !== 'production') {
  // Config.loadConfigSync();
  // }

  console.log(
    'NODE_ENV EN MIDDLEWARE (2):',
    process.env.NODE_ENV,
    'ENVIRONMENT EN MIDDLEWARE (2):',
    process.env.ENVIRONMENT
  );

  if (next) next();
}

function configureApp(app) {
  app.use(cors({ origin: true }));

  app.use(httpContext.middleware);

  // Se agrega el middleware en la aplicación.
  app.use(addSpanId);
  app.use(onlyLocalLoadEnv);
}

const vaultsApp = express();
configureApp(vaultsApp);
vaultsRoutesConfig(vaultsApp);
exports.vaultsPolygon = functions
  .runWith({
    memory: '2GB',
    // Keep 5 instances warm for this latency-critical function
    // in production only. Default to 0 for test projects.
    // minInstances: envProjectId === "my-production-project" ? 5 : 0,
  })
  .https.onRequest(vaultsApp);

exports.cronFetchVaultsBalances = cronFetchVaultsBalances;
exports.onVaultUpdate = onVaultUpdate;
exports.onVaultCreate = onVaultCreate;
