/* eslint-disable operator-linebreak */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

// require('@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json');
// require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
const { Pool, FeeAmount } = require('@uniswap/v3-sdk');
const { move } = require('fs-extra');
const { getEnvVariable } = require('../../vs-core-firebase/helpers/envGetter');

const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const JSBI = require('jsbi');

const admin = require('firebase-admin');
const functions = require('firebase-functions');

const { Safe, EthersAdapter, SafeFactory } = require('@safe-global/protocol-kit');

const { creationStruct, updateStruct } = require('../../vs-core-firebase/audit');
const { ErrorHelper } = require('../../vs-core-firebase');
const { LoggerHelper } = require('../../vs-core-firebase');
const { EmailSender } = require('../../vs-core-firebase');
const { Auth } = require('../../vs-core-firebase');
const {
  areRebasingTokensEqualWithDiff,
  areNonRebasingTokensEqual,
  getDifferences,
  formatMoneyWithCurrency,
  getArsStableValue,
  getArsVolatileValue,
  getUsdStableValue,
  getUsdVolatileValue,
} = require('../../helpers/coreHelper');

const { CustomError } = require('../../vs-core');

const { Types } = require('../../vs-core');
const { Collections } = require('../../types/collectionsTypes');
const { ContractTypes } = require('../../types/contractTypes');
const { TokenTypes, ActionTypes } = require('../../types/tokenTypes');
const { VaultTransactionTypes } = require('../../types/vaultTransactionTypes');
const { RebasingTokens } = require('../../types/RebasingTokens');
const { Valuation, Balance } = require('../../types/BalanceTypes');
const { networkTypes } = require('../../types/networkTypes');

const axios = require('axios');
const { getParsedEthersError } = require('./errorParser');
const schemas = require('./schemas');

// eslint-disable-next-line camelcase
const { invoke_get_api } = require('../../helpers/httpInvoker');
const { encodePath } = require('../../helpers/uniswapHelper');
const _ = require('lodash');

const {
  abi: SwapRouterABI,
} = require('@uniswap/universal-router/artifacts/contracts/UniversalRouter.sol/UniversalRouter.json');
const {
  abi: ERC20ABI,
} = require('../../../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');

const {
  getCurrencyDecimalsMap,
  getTokens,
  getTokenReference,
  getStaticPaths,
  getSwapOptions,
  getTokenOut,
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

const { SYS_ADMIN_EMAIL, API_PATH_QUOTES } = require('../../config/appConfig');

const hre = require('hardhat');
const { debug } = require('firebase-functions/logger');
const { TechnicalError } = require('../../vs-core/error');
// require('hardhat-change-network');

const COLLECTION_NAME = Collections.VAULTS;
const COLLECTION_VAULTS_BALANCE_HISTORY = Collections.VAULTS_BALANCE_HISTORY;
const COLLECTION_MARKET_CAP = Collections.MARKET_CAP;
const COLLECTION_TOKEN_RATIOS = Collections.TOKEN_RATIOS;
const COLLECTION_NAME_USERS = Collections.USERS;

const INDEXED_FILTERS = ['userId', 'companyId', 'state'];

const COMPANY_ENTITY_PROPERTY_NAME = 'companyId';
const USER_ENTITY_PROPERTY_NAME = 'userId';

exports.find = async function (req, res) {
  const { limit, offset } = req.query;
  let { filters } = req.query;

  if (!filters) filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  try {
    const result = await listByPropInner({
      limit,
      offset,
      filters,

      // primaryEntityPropName: COMPANY_ENTITY_PROPERTY_NAME,
      // primaryEntityValue: companyId,
      // primaryEntityCollectionName: Collections.COMPANIES,
      listByCollectionName: COLLECTION_NAME,
      indexedFilters: INDEXED_FILTERS,
      relationships: [
        { collectionName: Collections.USERS, propertyName: USER_ENTITY_PROPERTY_NAME },
        { collectionName: Collections.COMPANIES, propertyName: COMPANY_ENTITY_PROPERTY_NAME },
      ],
      postProcessor: async (items) => {
        const allItems = items.items.map((item) => {
          if (item.dueDate) item.dueDate = item.dueDate.toDate();
          return item;
        });

        items.items = allItems;

        return items;
      },
    });

    return res.send(result);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.findByCompany = async function (req, res) {
  const { companyId } = req.params;

  const { limit, offset } = req.query;
  let { filters } = req.query;

  if (!filters) filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  try {
    const result = await listByPropInner({
      limit,
      offset,
      filters,

      primaryEntityPropName: COMPANY_ENTITY_PROPERTY_NAME,
      primaryEntityValue: companyId,
      primaryEntityCollectionName: Collections.COMPANIES,
      listByCollectionName: COLLECTION_NAME,
      indexedFilters: INDEXED_FILTERS,
      relationships: [
        { collectionName: Collections.USERS, propertyName: USER_ENTITY_PROPERTY_NAME },
        { collectionName: Collections.COMPANIES, propertyName: COMPANY_ENTITY_PROPERTY_NAME },
      ],
      postProcessor: async (items) => {
        const allItems = items.items.map((item) => {
          if (item.dueDate) item.dueDate = item.dueDate.toDate();
          return item;
        });

        // TODO MICHEL
        // items.items = allItems;
        items.items = allItems;

        return items;
      },
    });

    return res.send(result);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.findByUser = async function (req, res) {
  const { userId } = req.params;

  const { limit, offset } = req.query;
  let { filters } = req.query;

  if (!filters) filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  try {
    const result = await listByPropInner({
      limit,
      offset,
      filters,

      primaryEntityPropName: USER_ENTITY_PROPERTY_NAME,
      primaryEntityValue: userId,
      primaryEntityCollectionName: Collections.USERS,
      listByCollectionName: COLLECTION_NAME,
      indexedFilters: INDEXED_FILTERS,
      relationships: [
        { collectionName: Collections.USERS, propertyName: USER_ENTITY_PROPERTY_NAME },
        { collectionName: Collections.COMPANIES, propertyName: COMPANY_ENTITY_PROPERTY_NAME },
      ],
      postProcessor: async (items) => {
        const allItems = items.items.map((item) => {
          if (item.dueDate) item.dueDate = item.dueDate.toDate();
          return item;
        });

        items.items = allItems;

        return items;
      },
    });

    return res.send(result);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.get = async function (req, res) {
  const { id, userId, companyId } = req.params;

  await getByProp({
    req,
    res,

    byId: id,

    // primaryEntityPropName: COMPANY_ENTITY_PROPERTY_NAME,
    // primaryEntityCollectionName: Collections.COMPANIES,
    collectionName: COLLECTION_NAME,

    relationships: [
      { collectionName: Collections.USERS, propertyName: USER_ENTITY_PROPERTY_NAME },
      { collectionName: Collections.COMPANIES, propertyName: COMPANY_ENTITY_PROPERTY_NAME },
    ],
    postProcessor: async (item) => {
      // Importante para validar permisos - complementario a routes-config
      if (userId && item && item.userId !== userId) throw new Error('userId missmatch');
      if (companyId && item && item.companyId !== companyId) throw new Error('companyId missmatch');

      if (item && item.dueDate) item.dueDate = item.dueDate.toDate();

      return item;
    },
  });
};

exports.patch = async function (req, res) {
  const { userId } = res.locals;
  const auditUid = userId;

  const { id, userId: targetUserId, companyId } = req.params;

  try {
    await secureArgsValidation({
      collectionName: COLLECTION_NAME,
      id,
      secureArgs: { companyId, userId: targetUserId },
    });

    const existentDoc = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });

    // MRM TODO revisar si es por esto que no actualiza bien rescuewalletAccount
    const { rescueWalletAccount } = req.body;
    if (existentDoc.rescueWalletAccount !== rescueWalletAccount) {
      console.log('Setting rescueWalletAccount in blockchain to ' + rescueWalletAccount);
      await setSmartContractRescueAcount({ vault: existentDoc, rescueWalletAccount });
      console.log('RescueWalletAccount in blockchain set OK');
    }

    console.log('Patch args (' + COLLECTION_NAME + '):', JSON.stringify(req.body));

    const itemData = await sanitizeData({ data: req.body, validationSchema: schemas.update });

    const doc = await updateSingleItem({
      collectionName: COLLECTION_NAME,
      id,
      auditUid,
      data: itemData,
    });
    console.log('Patch data: (' + COLLECTION_NAME + ')', JSON.stringify(itemData));

    // Envio mail si libera la bóveda
    if (req.body.amount == 0) {
      const employee = await fetchSingleItem({ collectionName: Collections.USERS, id: auditUid });
      const lender = await fetchSingleItem({
        collectionName: Collections.COMPANIES,
        id: companyId,
      });
      const borrower = await fetchSingleItem({
        collectionName: Collections.USERS,
        id: targetUserId,
      });

      const arsBalance = req.body.balances.find((bal) => bal.isValuation && bal.currency === 'ars');

      // Envio el email al empleado que creó la boveda
      EmailSender.send({
        to: employee.email,
        message: null,
        template: {
          name: 'mail-liberate',
          data: {
            username: employee.firstName + ' ' + employee.lastName,
            vaultId: id,
            lender: lender.name,
            value: arsBalance.value,
            currency: 'ars',
          },
        },
      });

      EmailSender.send({
        to: SYS_ADMIN_EMAIL,
        message: null,
        template: {
          name: 'mail-liberate',
          data: {
            username: employee.firstName + ' ' + employee.lastName,
            vaultId: id,
            lender: lender.name,
            value: arsBalance.value,
            currency: 'ars',
          },
        },
      });

      // Envio el email al borrower de esta boveda
      EmailSender.send({
        to: borrower.email,
        message: null,
        template: {
          name: 'mail-liberate',
          data: {
            username: borrower.firstName + ' ' + borrower.lastName,
            vaultId: id,
            lender: lender.name,
            value: arsBalance.value,
            currency: 'ars',
          },
        },
      });
    }

    return res.status(204).send(doc);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.remove = async function (req, res) {
  await remove(req, res, COLLECTION_NAME);
};

const parseContractDeploymentToObject = (deploymentResponse) => {
  if (!deploymentResponse) return null;

  const deployTransaction = {};
  const contractFunctions = [];
  let signerAddress = null;

  if (deploymentResponse.deployTransaction) {
    const keys = Object.keys(deploymentResponse.deployTransaction);

    keys.forEach((key) => {
      if (typeof deploymentResponse.deployTransaction[key] === 'function') return;

      deployTransaction[key] = JSON.parse(
        JSON.stringify(deploymentResponse.deployTransaction[key])
      );
    });
  }

  if (deploymentResponse.functions) {
    const keys = Object.keys(deploymentResponse.functions);

    keys.forEach((key) => {
      contractFunctions.push(key);
    });
  }

  if (deploymentResponse.signer && deploymentResponse.signer.address) {
    signerAddress = deploymentResponse.signer.address;
  }

  return {
    deployTransaction,
    contractFunctions,
    signerAddress,
    address: deploymentResponse.address,
  };
};

const deployContract = async (
  contractName,
  args = null,
  networkName = null,
  networkConfig = null
) => {
  if (!contractName) return null;
  let contract;
  let NETWORK_URL;
  let alchemy;
  let signer;
  let DEPLOYER_PRIVATE_KEY;

  if (networkName) {
    NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
    DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', networkName);

    console.log('deployContract NETWORK_URL ' + NETWORK_URL);
    console.log('deployContract contractName ' + contractName);
    console.log('deployContract args ' + JSON.stringify(args));
    console.log('deployContract networkName ' + networkName);
    console.log('deployContract networkConfig ' + JSON.stringify(networkConfig));

    alchemy = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);
    signer = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, alchemy);
    contract = await hre.ethers.getContractFactory(contractName, signer);
  } else {
    contract = await hre.ethers.getContractFactory(contractName);
  }

  console.log('Signer: ', signer.address);

  let deploymentResponse;
  // Verifica si args es null, un valor único, o un array.
  if (args === null) {
    deploymentResponse = await contract.deploy(networkConfig);
  } else if (Array.isArray(args)) {
    deploymentResponse = await contract.deploy(...args, networkConfig);
  } else {
    // Caso en que args es un valor único
    deploymentResponse = await contract.deploy(args, networkConfig);
  }

  console.log('deployContract - Contract deployed');
  // Parse
  const contractDeployment = parseContractDeploymentToObject(deploymentResponse);

  return { deploymentResponse, contractDeployment };
};

const getDeployedContract = async (vault) => {
  console.log('Dentro de getDeployedContract');
  console.log(
    'Dentro de getDeployedContract - Vault id ',
    vault.id,
    ' Contractname ',
    vault.contractName,
    ' Contract Version ',
    vault.contractVersion,
    ' Contract Network ',
    vault.contractNetwork
  );
  const smartContract = vault;

  const contractJson = require('../../../artifacts/contracts/' +
    smartContract.contractName +
    '.sol/' +
    smartContract.contractName +
    '.json');
  const abi = contractJson.abi;

  const contractNetwork = (vault.contractNetwork || 'POLYGON').toUpperCase();
  console.log('Contract Network ', vault.contractNetwork || 'Red por defecto: POLYGON');

  const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', contractNetwork);
  const DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', contractNetwork);

  if (!NETWORK_URL) {
    throw new Error(`No se encontró una URL válida para la red: ${contractNetwork}`);
  }

  // TODO Validar que la red que tomé de la base es válida
  console.log('getDeployedContract - NETWORK_URL ' + NETWORK_URL);
  const alchemy = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);
  const userWallet = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, alchemy);

  // Get the deployed contract.
  const blockchainContract = new hre.ethers.Contract(smartContract.id, abi, userWallet); // smartContract.proxyContractAddress

  return blockchainContract;
};

const createCreditVault = async ({
  networkName,
  targetUserId,
  companyId,
  lender,
  vaultAdminAddress, // This is passed in from create()
  auditUid,
  body,
}) => {
  // Remove this section since vaultAdminAddress is now handled in create()
  // if (networkName.toLowerCase() === 'polygon') {
  //   vaultAdminAddress = lender.vaultAdminAddressPolygon;
  // } else if (networkName.toLowerCase() === 'rootstock') {
  //   vaultAdminAddress = lender.vaultAdminAddressRootstock;
  // }
  // if (!vaultAdminAddress && lender.vaultAdminAddress) {
  //   vaultAdminAddress = lender.vaultAdminAddress;
  // }

  if (!vaultAdminAddress) {
    throw new CustomError.TechnicalError(
      'ERROR_VAULT_ADMIN_NOT_FOUND',
      null,
      `Vault Admin not found for network ${networkName}`,
      null
    );
  }

  // Extract existing credit vault creation logic
  let safeA;
  let safeB;

  switch (networkName) {
    case networkTypes.NETWORK_TYPE_POLYGON:
      safeA = lender.safeLiq1.toLowerCase();
      safeB = lender.safeLiq2.toLowerCase();
      break;
    case networkTypes.NETWORK_TYPE_ROOTSTOCK:
      safeA = lender.safeLiq3.toLowerCase();
      safeB = lender.safeLiq4.toLowerCase();
      break;
    default:
      break;
  }

  const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
  const DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', networkName);
  const alchemy = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);

  const colateralContractName = 'ColateralContract2';
  const proxyContractName = 'ColateralProxy';

  // Defino el gas
  const networkConfig = await getGasPriceAndLimit(networkName, 'CREATE');
  console.log(
    'Create - Listo getGasPriceAndLimit - networkConfig es ' +
      JSON.stringify(networkConfig, null, 2)
  );

  let contractStatus;
  let contractError = '';
  let colateralContractAddress;
  let colateralContractDeploy;

  try {
    // Deploy ColateralContract
    colateralContractDeploy = await deployContract(
      colateralContractName,
      null,
      networkName,
      networkConfig
    );

    const deploymentResponse = await colateralContractDeploy.deploymentResponse.deployed();
    const transactionHash = colateralContractDeploy.deploymentResponse.deployTransaction.hash;

    colateralContractAddress = colateralContractDeploy.contractDeployment.address;

    if (!colateralContractAddress) {
      throw new CustomError.TechnicalError(
        ' ERROR_CREATE_COLATERAL_CONTRACT',
        null,
        'Empty Colateral contract address response',
        null
      );
    }

    console.log(
      'Create - ColateralContract Deployment success. Transaction Hash:',
      transactionHash
    );
    contractStatus = 'deployed';
  } catch (err) {
    contractStatus = 'error';
    contractError = err.message ? err.message.substring(0, 2000) : '';
    throw new CustomError.TechnicalError(
      'ERROR_CREATE_COLATERAL_CONTRACT',
      null,
      contractError,
      null
    );
  }

  // Deploy ColateralProxy

  const contractJson = require('../../../artifacts/contracts/' +
    colateralContractName +
    '.sol/' +
    colateralContractName +
    '.json');

  const colateralAbi = contractJson.abi;

  const deployerWallet = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, alchemy);
  const colateralBlockchainContract = new hre.ethers.Contract(
    colateralContractAddress,
    colateralAbi,
    deployerWallet
  );

  let args;
  let abiEncodedArgs;

  const operator1Address = await getEnvVariable('OPERATOR1_ADDRESS', networkName);
  const operator2Address = await getEnvVariable('OPERATOR2_ADDRESS', networkName);
  const operator3Address = await getEnvVariable('OPERATOR3_ADDRESS', networkName);

  // Asignar las direcciones a la lista de operadores
  const operators = [operator1Address, operator2Address, operator3Address];

  const defaultRescueWalletAddress = await getEnvVariable(
    'DEFAULT_RESCUE_WALLET_ADDRESS',
    networkName
  );
  const defaultWithdrawWalletAddress = await getEnvVariable(
    'DEFAULT_WITHDRAW_WALLET_ADDRESS',
    networkName
  );

  if (colateralContractName === 'ColateralContract2') {
    // Contrato version 2
    console.log('Create - creando contrato version 2 ');

    // Usar getEnvVariable para obtener las direcciones desde Firestore
    const validatorAddress = await getEnvVariable('VALIDATOR_CONTRACT_ADDRESS', networkName);

    const swapRouterV3Address = await getEnvVariable('SWAP_ROUTER_V3_ADDRESS', networkName);
    const swapperAddress = await getEnvVariable('SWAPPER_ADDRESS', networkName);

    const tokenNames = ['USDC', 'USDT', 'USDM', 'WBTC', 'WETH'];

    const tokenAddresses = [
      await getEnvVariable('USDC_TOKEN_ADDRESS', networkName),
      await getEnvVariable('USDT_TOKEN_ADDRESS', networkName),
      await getEnvVariable('USDM_TOKEN_ADDRESS', networkName),
      await getEnvVariable('WBTC_TOKEN_ADDRESS', networkName),
      await getEnvVariable('WETH_TOKEN_ADDRESS', networkName),
    ];

    const contractKeys = ['router', 'swapper'];
    const contractAddresses = [swapRouterV3Address, swapperAddress];

    // We use .toLowerCase() because RSK has a different address checksum (capitalization of letters) that Ethereum
    args = [
      validatorAddress,
      tokenNames,
      tokenAddresses,
      operators,
      defaultRescueWalletAddress,
      defaultWithdrawWalletAddress,
      safeA,
      safeB,
      contractKeys,
      contractAddresses,
    ];

    console.log('Create - args ' + JSON.stringify(args));
  } else {
    // Contrato version 1
    console.log('Create - creando contrato version 1 ');

    // Usar getEnvVariable para obtener las direcciones desde Firestore
    const usdcTokenAddress = await getEnvVariable('USDC_TOKEN_ADDRESS', networkName);
    const usdtTokenAddress = await getEnvVariable('USDT_TOKEN_ADDRESS', networkName);
    const usdmTokenAddress = await getEnvVariable('USDM_TOKEN_ADDRESS', networkName);
    const wbtcTokenAddress = await getEnvVariable('WBTC_TOKEN_ADDRESS', networkName);

    const swapRouterV3Address = await getEnvVariable('SWAP_ROUTER_V3_ADDRESS', networkName);
    const swapperAddress = await getEnvVariable('SWAPPER_ADDRESS', networkName);

    // Crear los argumentos para el contrato
    args = [
      usdcTokenAddress,
      usdtTokenAddress,
      usdmTokenAddress,
      wbtcTokenAddress,
      operators, // Supongo que ya tienes esta variable en tu entorno
      defaultRescueWalletAddress,
      defaultWithdrawWalletAddress,
      safeA, // lender.safeLiq1
      safeB,
      swapRouterV3Address,
      swapperAddress,
    ];

    console.log('Create - args ' + JSON.stringify(args));
  }

  const initializeData = await colateralBlockchainContract.populateTransaction.initialize(...args);

  console.log('Create - proxy args ');
  console.log(args);

  const proxyContractArgs = [
    colateralContractAddress,
    vaultAdminAddress,
    initializeData.data || '0x',
  ];

  const proxyContractDeploy = await deployContract(
    proxyContractName,
    proxyContractArgs,
    networkName,
    networkConfig
  );
  const proxyContractAddress = proxyContractDeploy.contractDeployment.address;

  if (!proxyContractAddress) {
    throw new CustomError.TechnicalError(
      'ERROR_CREATE_PROXY_CONTRACT',
      null,
      'Empty Proxy contract address response',
      null
    );
  }

  // Add credit-specific fields
  body.contractAddress = colateralContractAddress;
  body.contractSignerAddress = safeA;
  body.contractDeployment = colateralContractDeploy.contractDeployment;
  body.abiencodedargs = abiEncodedArgs;
  body.contractName = colateralContractName;
  body.contractStatus = contractStatus;
  body.contractVersion = '2.0.0';
  body.contractError = contractError || null;
  body.proxyContractAddress = proxyContractAddress;
  body.proxyContractSignerAddress = safeA;
  body.proxyContractDeployment = proxyContractDeploy.contractDeployment;
  body.proxyContractName = proxyContractName;
  body.proxyContractStatus = 'deployed';
  body.proxyContractVersion = 'TransparentUpgradeable';
  body.rescueWalletAccount = defaultRescueWalletAddress;
  body.withdrawWalletAccount = defaultWithdrawWalletAddress;
  body.serviceLevel = Types.serviceLevels.SERVICE_LEVEL_STANDARD;
  // Set default service level if not defined
  if (!body.serviceLevel) {
    body.serviceLevel = Types.serviceLevels.SERVICE_LEVEL_STANDARD;
  }
  console.log('Create Credit Vault - body ', JSON.stringify(body, null, 2));

  // Store entity
  const itemData = await sanitizeData({ data: body, validationSchema: schemas.create });
  const dbItemData = await createFirestoreDocument({
    collectionName: COLLECTION_NAME,
    itemData,
    auditUid,
    documentId: proxyContractAddress,
  });

  return dbItemData;
};

// First rename createSavingsVault to createTrustVault
const createTrustVault = async ({
  networkName,
  targetUserId,
  companyId,
  lender,
  auditUid,
  body,
}) => {
  // Validate required keys
  if (!body.keyA || !body.keyB) {
    throw new CustomError.TechnicalError(
      'ERROR_MISSING_KEYS',
      null,
      'Required keys not provided for Trust vault',
      null
    );
  }

  // Validate addresses
  try {
    body.keyA = hre.ethers.utils.getAddress(body.keyA);
    body.keyB = hre.ethers.utils.getAddress(body.keyB);
  } catch (error) {
    throw new CustomError.TechnicalError(
      'ERROR_INVALID_ADDRESS',
      null,
      'Invalid ethereum address provided for keys',
      null
    );
  }

  const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
  const DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', networkName);

  // Create provider and signer
  const provider = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);
  const signer = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  // Create ethAdapter with both signer and provider
  const ethAdapter = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: signer,
    provider,
  });

  // Configure Safe Account with provided keys
  const safeAccountConfig = {
    owners: [body.keyA, body.keyB],
    threshold: 2,
  };

  const defaultRescueWalletAddress = await getEnvVariable(
    'DEFAULT_RESCUE_WALLET_ADDRESS',
    networkName
  );
  const defaultWithdrawWalletAddress = await getEnvVariable(
    'DEFAULT_WITHDRAW_WALLET_ADDRESS',
    networkName
  );

  // Initialize Safe Factory
  const safeFactory = await SafeFactory.create({ ethAdapter });

  // Deploy Safe
  const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });

  const safeAddress = safeSdk.getAddress();
  const safeVersion = await safeSdk.getContractVersion();

  // Add required fields for schema validation
  body.safeAddress = safeAddress;
  body.safeOwners = safeAccountConfig.owners;
  body.safeThreshold = safeAccountConfig.threshold;
  body.contractStatus = 'deployed';

  // Add contract-related fields required by schema
  body.contractAddress = safeAddress;
  body.contractSignerAddress = safeAddress;
  body.contractDeployment = 'GnosisSafe';
  body.contractName = 'GnosisSafe';
  body.contractVersion = safeVersion;
  body.proxyContractAddress = safeAddress;
  body.proxyContractVersion = safeVersion;
  body.proxyContractSignerAddress = safeSdk.getAddress();
  body.proxyContractName = 'GnosisSafeProxy';
  body.proxyContractStatus = 'deployed';
  body.proxyContractDeployment = 'GnosisSafeProxy';
  body.rescueWalletAccount = defaultRescueWalletAddress;
  body.withdrawWalletAccount = defaultWithdrawWalletAddress;

  console.log('Create Trust Vault - body ', JSON.stringify(body, null, 2));

  // Sanitize entity
  const itemData = await sanitizeData({ data: body, validationSchema: schemas.create });

  const dbItemData = await createFirestoreDocument({
    collectionName: COLLECTION_NAME,
    itemData,
    auditUid,
    documentId: safeAddress,
  });

  return dbItemData;
};

// Add new vault creation functions that are copies of createTrustVault
const createStandardVault = async ({
  networkName,
  targetUserId,
  companyId,
  lender,
  auditUid,
  body,
}) => {
  // Validate required keys
  if (!body.keyA || !body.keyB || !body.keyC) {
    throw new CustomError.TechnicalError(
      'ERROR_MISSING_KEYS',
      null,
      'Required keys not provided for Standard vault',
      null
    );
  }

  // Validate addresses
  try {
    body.keyA = hre.ethers.utils.getAddress(body.keyA);
    body.keyB = hre.ethers.utils.getAddress(body.keyB);
    body.keyC = hre.ethers.utils.getAddress(body.keyC);
  } catch (error) {
    throw new CustomError.TechnicalError(
      'ERROR_INVALID_ADDRESS',
      null,
      'Invalid ethereum address provided for keys',
      null
    );
  }

  const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
  const DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', networkName);

  // Create provider and signer
  const provider = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);
  const signer = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  // Create ethAdapter with both signer and provider
  const ethAdapter = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: signer,
    provider,
  });

  // Configure Safe Account with provided keys
  const safeAccountConfig = {
    owners: [body.keyA, body.keyB, body.keyC],
    threshold: 2, // Still require 2 signatures even with 3 owners
  };

  const defaultRescueWalletAddress = await getEnvVariable(
    'DEFAULT_RESCUE_WALLET_ADDRESS',
    networkName
  );
  const defaultWithdrawWalletAddress = await getEnvVariable(
    'DEFAULT_WITHDRAW_WALLET_ADDRESS',
    networkName
  );

  // Initialize Safe Factory
  const safeFactory = await SafeFactory.create({ ethAdapter });

  // Deploy Safe
  const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });

  const safeAddress = safeSdk.getAddress();
  const safeVersion = await safeSdk.getContractVersion();

  // Add required fields for schema validation
  body.safeAddress = safeAddress;
  body.safeOwners = safeAccountConfig.owners;
  body.safeThreshold = safeAccountConfig.threshold;
  body.contractStatus = 'deployed';

  // Add contract-related fields required by schema
  body.contractAddress = safeAddress;
  body.contractSignerAddress = safeAddress;
  body.contractDeployment = 'GnosisSafe';
  body.contractName = 'GnosisSafe';
  body.contractVersion = safeVersion;
  body.proxyContractAddress = safeAddress;
  body.proxyContractVersion = safeVersion;
  body.proxyContractSignerAddress = safeSdk.getAddress();
  body.proxyContractName = 'GnosisSafeProxy';
  body.proxyContractStatus = 'deployed';
  body.proxyContractDeployment = 'GnosisSafeProxy';
  body.rescueWalletAccount = defaultRescueWalletAddress;
  body.withdrawWalletAccount = defaultWithdrawWalletAddress;

  console.log('Create Standard Vault - body ', JSON.stringify(body, null, 2));

  // Sanitize entity
  const itemData = await sanitizeData({ data: body, validationSchema: schemas.create });

  const dbItemData = await createFirestoreDocument({
    collectionName: COLLECTION_NAME,
    itemData,
    auditUid,
    documentId: safeAddress,
  });

  return dbItemData;
};

const createPremiumVaultwithAllowance = async ({
  networkName,
  targetUserId,
  companyId,
  lender,
  auditUid,
  body,
}) => {
  // Validate required keys
  if (!body.keyA || !body.keyB || !body.keyC || !body.keyD || !body.keyE) {
    throw new CustomError.TechnicalError(
      'ERROR_MISSING_KEYS',
      null,
      'Required keys not provided for Premium vault',
      null
    );
  }

  // Validate addresses
  try {
    body.keyA = hre.ethers.utils.getAddress(body.keyA);
    body.keyB = hre.ethers.utils.getAddress(body.keyB);
    body.keyC = hre.ethers.utils.getAddress(body.keyC);
    body.keyD = hre.ethers.utils.getAddress(body.keyD);
    body.keyE = hre.ethers.utils.getAddress(body.keyE);
  } catch (error) {
    throw new CustomError.TechnicalError(
      'ERROR_INVALID_ADDRESS',
      null,
      'Invalid ethereum address provided for keys',
      null
    );
  }

  const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
  const DEPLOYER_PRIVATE_KEY = await getEnvVariable('DEPLOYER_PRIVATE_KEY', networkName);

  // Create provider and signer
  const provider = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);
  const signer = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  // Create ethAdapter with both signer and provider
  const ethAdapter = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: signer,
    provider,
  });

  // Configure Safe Account with provided keys
  const safeAAccountConfig = {
    owners: [body.keyA, body.keyB, body.keyC],
    threshold: 2, // Still require 2 signatures even with 3 owners
  };

  const safeBAccountConfig = {
    owners: [body.keyD, body.keyE],
    threshold: 2,
  };

  const defaultRescueWalletAddress = await getEnvVariable(
    'DEFAULT_RESCUE_WALLET_ADDRESS',
    networkName
  );
  const defaultWithdrawWalletAddress = await getEnvVariable(
    'DEFAULT_WITHDRAW_WALLET_ADDRESS',
    networkName
  );

  // Initialize Safe Factory
  const safeFactory = await SafeFactory.create({ ethAdapter });

  // Deploy Safe
  const safeASdk = await safeFactory.deploySafe({
    safeAccountConfig: safeAAccountConfig, // Fix: use safeAccountConfig as the property name
  });
  console.log('Premium vault - safe A created', safeASdk.getAddress()); // Fix: getAddress is a function
  const safeAAddress = await safeASdk.getAddress(); // Fix: await the promise

  const safeBSdk = await safeFactory.deploySafe({
    safeAccountConfig: safeBAccountConfig, // Fix: use safeAccountConfig as the property name
  });
  console.log('Premium vault - safe B created', safeBSdk.getAddress()); // Fix: getAddress is a function
  const safeBAddress = await safeBSdk.getAddress(); // Fix: await the promise

  const deployerAddress = await signer.getAddress();

  const safeAccountTemporaryConfig = {
    owners: [safeAAddress, deployerAddress],
    threshold: 1, // Only 1 signature from either safe is required for the Premium vault
  };

  // LET'S DANCE
  const tokenAddresses = [
    await getEnvVariable('USDC_TOKEN_ADDRESS', networkName),
    await getEnvVariable('USDT_TOKEN_ADDRESS', networkName),
    await getEnvVariable('USDM_TOKEN_ADDRESS', networkName),
    await getEnvVariable('WBTC_TOKEN_ADDRESS', networkName),
    await getEnvVariable('WETH_TOKEN_ADDRESS', networkName),
  ];

  const tokenApproveAbi = [
    'function approve(address spender, uint256 value) public returns (bool)',
  ];

  // Create token contracts with signer for approvals
  const tokenContracts = tokenAddresses.map((tokenAddress) => {
    return new hre.ethers.Contract(
      tokenAddress,
      tokenApproveAbi,
      signer // Use signer instead of provider to be able to send transactions
    );
  });

  console.log('Premium vault - Token contracts ready:', tokenContracts.length);

  // After deploying the main safe...
  const safeSdk = await safeFactory.deploySafe({
    safeAccountConfig: safeAccountTemporaryConfig,
  });
  const safeAddress = await safeSdk.getAddress();
  console.log('Premium vault - Main Safe created', safeAddress);

  // Create batch of transactions for both Safe A and Safe B approvals
  console.log('Premium vault - Creating batch approval transactions');
  const multiSendTxs = [];

  // Add approvals for Safe A
  for (const tokenContract of tokenContracts) {
    multiSendTxs.push({
      to: tokenContract.address,
      value: '0',
      data: tokenContract.interface.encodeFunctionData('approve', [
        safeAAddress,
        hre.ethers.constants.MaxUint256,
      ]),
    });
  }

  // Add approvals for Safe B
  for (const tokenContract of tokenContracts) {
    multiSendTxs.push({
      to: tokenContract.address,
      value: '0',
      data: tokenContract.interface.encodeFunctionData('approve', [
        safeBAddress,
        hre.ethers.constants.MaxUint256,
      ]),
    });
  }

  console.log('Premium vault - Approval ready to be executed');

  // Create and execute the batch transaction
  try {
    const multiSendTx = await safeSdk.createTransaction({
      safeTransactionData: multiSendTxs,
    });

    const signedTx = await safeSdk.signTransaction(multiSendTx);
    const executeTxResponse = await safeSdk.executeTransaction(signedTx);
    await executeTxResponse.transactionResponse?.wait();

    console.log('Premium vault - All token approvals confirmed in single transaction');
  } catch (error) {
    console.error('Premium vault - Error executing batch token approvals:', error);
    throw new CustomError.TechnicalError(
      'ERROR_TOKEN_APPROVALS',
      error,
      'Error executing batch token approvals',
      null
    );
  }

  // Continue with adding Safe B as owner and removing deployer...

  // Create transaction to add safeBAddress as owner
  console.log('Premium vault - Adding Safe B as owner');
  const safeInterface = new hre.ethers.utils.Interface([
    'function addOwnerWithThreshold(address owner, uint256 _threshold) public',
    'function removeOwner(address prevOwner, address owner, uint256 _threshold) public',
  ]);

  const addOwnerTx = await safeSdk.createTransaction({
    safeTransactionData: {
      to: await safeSdk.getAddress(),
      value: '0',
      data: safeInterface.encodeFunctionData('addOwnerWithThreshold', [
        safeBAddress,
        1, // threshold
      ]),
    },
  });

  // Execute transaction
  try {
    const signedTx = await safeSdk.signTransaction(addOwnerTx);
    const executeTxResponse = await safeSdk.executeTransaction(signedTx);
    await executeTxResponse.transactionResponse?.wait();

    console.log('Premium vault - Safe B added as owner');
  } catch (error) {
    console.error('Premium vault - Error adding Safe B as owner:', error);
    throw new CustomError.TechnicalError(
      'ERROR_ADDING_OWNER',
      error,
      'Error adding Safe B as owner to main safe',
      null
    );
  }

  // Remove deployer as owner
  console.log('Premium vault - Removing deployer as owner');
  const removeOwnerTx = await safeSdk.createTransaction({
    safeTransactionData: {
      to: await safeSdk.getAddress(),
      value: '0',
      data: safeInterface.encodeFunctionData('removeOwner', [
        safeAAddress, // prevOwner - the owner that comes before the one we want to remove
        deployerAddress, // owner to remove
        1, // keep threshold at 2
      ]),
    },
  });

  let safeOwners; // Declare safeOwners here so it's available in the wider scope

  try {
    const signedRemoveTx = await safeSdk.signTransaction(removeOwnerTx);
    const executeRemoveTxResponse = await safeSdk.executeTransaction(signedRemoveTx);
    await executeRemoveTxResponse.transactionResponse?.wait();

    console.log('Premium vault - Deployer removed as owner');

    // Verify final owners
    safeOwners = await safeSdk.getOwners(); // Assign to the outer scope variable
    console.log('Premium vault - Final safe owners:', {
      owners: safeOwners,
      expectedOwners: [safeAAddress, safeBAddress],
      match:
        safeOwners.length === 2 &&
        safeOwners.includes(safeAAddress) &&
        safeOwners.includes(safeBAddress),
    });

    // Optional: throw error if owners don't match expected
    if (
      !safeOwners.includes(safeAAddress) ||
      !safeOwners.includes(safeBAddress) ||
      safeOwners.length !== 2
    ) {
      throw new CustomError.TechnicalError(
        'ERROR_OWNER_VERIFICATION',
        null,
        'Final safe owners do not match expected configuration',
        null
      );
    }
  } catch (error) {
    console.error('Premium vault - Error removing deployer as owner:', error);
    throw new CustomError.TechnicalError(
      'ERROR_REMOVING_OWNER',
      error,
      'Error removing deployer as owner from main safe',
      null
    );
  }

  const safeVersion = await safeSdk.getContractVersion();
  // Add required fields for schema validation
  body.safeAddress = safeAddress;
  body.safeAAddress = safeAAddress;
  body.safeBAddress = safeBAddress;
  body.safeOwners = safeOwners; // Now safeOwners is defined
  body.safeThreshold = safeAccountTemporaryConfig.threshold;
  body.contractStatus = 'deployed';

  // Add contract-related fields required by schema
  body.contractAddress = safeAddress;
  body.contractSignerAddress = safeAddress;
  body.contractDeployment = 'GnosisSafe';
  body.contractName = 'GnosisSafe';
  body.contractVersion = safeVersion;
  body.proxyContractAddress = safeAddress;
  body.proxyContractVersion = safeVersion;
  body.proxyContractSignerAddress = safeSdk.getAddress();
  body.proxyContractName = 'GnosisSafeProxy';
  body.proxyContractStatus = 'deployed';
  body.proxyContractDeployment = 'GnosisSafeProxy';
  body.rescueWalletAccount = defaultRescueWalletAddress;
  body.withdrawWalletAccount = defaultWithdrawWalletAddress;
  console.log('Create Standard Vault - body ', JSON.stringify(body, null, 2));

  // Sanitize entity
  const itemData = await sanitizeData({ data: body, validationSchema: schemas.create });

  const dbItemData = await createFirestoreDocument({
    collectionName: COLLECTION_NAME,
    itemData,
    auditUid,
    documentId: safeAddress,
  });

  return dbItemData;
};

const createPrivateVault = async ({
  networkName,
  targetUserId,
  companyId,
  lender,
  auditUid,
  body,
}) => {
  // Same implementation as createTrustVault for now
  return await createTrustVault({
    networkName,
    targetUserId,
    companyId,
    lender,
    auditUid,
    body,
  });
};

// Update the create function with new logic
exports.create = async function (req, res) {
  try {
    const { userId } = res.locals;
    const auditUid = userId;
    const { userId: targetUserId, companyId } = req.params;
    const networkName = (req.body.networkTypes || req.body.networkName || 'POLYGON').toUpperCase();
    const vaultType = req.body.vaultType || 'credit'; // Default to credit for backward compatibility
    const serviceLevel = req.body.serviceLevel || Types.serviceLevels.SERVICE_LEVEL_STANDARD;

    // Validate required params
    if (!targetUserId || !companyId) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_ARGS',
        null,
        'Invalid args creating contract',
        null
      );
    }

    // Get and validate lender
    const lender = await fetchSingleItem({ collectionName: Collections.COMPANIES, id: companyId });
    if (!lender) {
      throw new CustomError.TechnicalError(
        'ERROR_COMPANY_NOT_FOUND',
        null,
        'Company not found for Vault creation',
        null
      );
    }

    // Get vaultAdminAddress based on network
    let vaultAdminAddress;
    if (networkName.toLowerCase() === 'polygon') {
      vaultAdminAddress = lender.vaultAdminAddressPolygon;
    } else if (networkName.toLowerCase() === 'rootstock') {
      vaultAdminAddress = lender.vaultAdminAddressRootstock;
    }
    if (!vaultAdminAddress && lender.vaultAdminAddress) {
      vaultAdminAddress = lender.vaultAdminAddress;
    }

    // Prepare common entity fields
    const body = {
      ...req.body,
      userId: targetUserId,
      companyId,
      contractNetwork: networkName,
      vaultType,
      balances: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      state: Types.StateTypes.STATE_ACTIVE,
    };

    // Create vault based on type and service level
    let dbItemData;

    if (vaultType === Types.VaultTypes.VAULT_TYPE_CREDIT) {
      dbItemData = await createCreditVault({
        networkName,
        targetUserId,
        companyId,
        lender,
        vaultAdminAddress,
        auditUid,
        body,
      });
    } else if (vaultType === Types.VaultTypes.VAULT_TYPE_SAVINGS) {
      switch (serviceLevel) {
        case Types.serviceLevels.SERVICE_LEVEL_STANDARD:
          dbItemData = await createStandardVault({
            networkName,
            targetUserId,
            companyId,
            lender,
            auditUid,
            body,
          });
          break;
        case Types.serviceLevels.SERVICE_LEVEL_PREMIUM:
          dbItemData = await createPremiumVaultwithAllowance({
            networkName,
            targetUserId,
            companyId,
            lender,
            auditUid,
            body,
          });
          break;
        case Types.serviceLevels.SERVICE_LEVEL_PRIVATE:
          dbItemData = await createPrivateVault({
            networkName,
            targetUserId,
            companyId,
            lender,
            auditUid,
            body,
          });
          break;
        case Types.serviceLevels.SERVICE_LEVEL_TRUST:
          dbItemData = await createTrustVault({
            networkName,
            targetUserId,
            companyId,
            lender,
            auditUid,
            body,
          });
          break;
        default:
          throw new CustomError.TechnicalError(
            'ERROR_INVALID_SERVICE_LEVEL',
            null,
            'Invalid service level for savings vault',
            null
          );
      }
    } else {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_VAULT_TYPE',
        null,
        'Invalid vault type',
        null
      );
    }

    return res.status(201).send(dbItemData);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const getGasPriceAndLimit = async (networkName = 'POLYGON', actionName) => {
  console.log(' getGasPriceAndLimit - networkName - ', networkName, ' actionName - ', actionName);
  const functionName = 'getGasPriceAndLimit'; // Nombre de la función para los mensajes de error
  const gasPriceFallback = 50000000000; // Fallback gas price (en wei)

  // Lista fija de acciones permitidas
  const allowedActions = ['CREATE', 'TRANSFER', 'SWAP'];

  // Definición de gasLimit por acción (valores por defecto)
  const gasLimitActionFallback = {
    CREATE: 5000000, // 5,000,000 para CREATE
    TRANSFER: 500000, // 500,000 para TRANSFER
    SWAP: 1000000, // 1,000,000 para SWAP
  };

  // Convertir el enum en una lista de valores válidos
  const validNetworks = Object.values(networkTypes);
  // Verificaciones iniciales
  if (!networkName || !validNetworks.includes(networkName)) {
    const errorMessage = `${functionName} - Invalid or undefined networkName: ${networkName}. Supported networks are: ${validNetworks.join(
      ', '
    )}. Called with networkName=${networkName}, actionName=${actionName}`;
    throw new Error(errorMessage);
  }

  // Verificar que actionName esté en la lista de acciones permitidas
  if (!actionName || !allowedActions.includes(actionName)) {
    const errorMessage = `${functionName} - Invalid or undefined actionName: ${actionName}. Allowed actions are: ${allowedActions.join(
      ', '
    )}. Called with networkName=${networkName}, actionName=${actionName}`;
    throw new Error(errorMessage);
  }

  // Inicialización y valores de fallback
  let gasPrice = gasPriceFallback;
  let gasLimit = gasLimitActionFallback[actionName]; // Inicializar con el valor de fallback correspondiente a la acción
  let maxFeePerGas;
  let maxPriorityFeePerGas;
  let gasLimitEnv;
  const gasLimitVariable = `GAS_LIMIT_${actionName.toUpperCase()}`;
  let networkConfig;

  try {
    // Obtener URL del proveedor RPC usando el networkName
    const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);

    gasLimitEnv = await getEnvVariable(gasLimitVariable, networkName);
    if (gasLimitEnv) {
      gasLimit = parseInt(gasLimitEnv, 10); // Sobrescribir el fallback con el valor encontrado
    } else {
      const errorMessage = `${functionName} - Error getting price limit from database. Called with networkName=${networkName}`;
      console.error(functionName, errorMessage);
      throw new Error(errorMessage);
    }

    // Obtener el valor de OVERRIDE_GAS_PRICE para saber si hay que usar el valor por override
    const OVERRIDE_GAS_PRICE = await getEnvVariable('OVERRIDE_GAS_PRICE', networkName);

    // Step 1: Cálculo del Gas Price
    if (OVERRIDE_GAS_PRICE === 'TRUE') {
      // Si OVERRIDE_GAS_PRICE está activado, obtener el valor del gasPrice de OVERRIDE_GAS_PRICE_VALUE
      gasPrice = await getEnvVariable('OVERRIDE_GAS_PRICE_VALUE', networkName);
      networkConfig = {
        gasPrice, // gasPrice ya está en el formato correcto, no es necesario volver a aplicarlo a BigNumber
        gasLimit, // Usar el gasLimit específico para la acción, ya sea dinámico o fallback
      };
    } else {
      // Si OVERRIDE_GAS_PRICE es false, determinar gasPrice basado en la red
      const provider = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);

      if (networkName === 'ROOTSTOCK') {
        // Obtener gas price para RSK
        const gasPriceData = await provider.getGasPrice();
        gasPrice = Math.round(hre.ethers.BigNumber.from(gasPriceData).toString() * 1.1); // Convertir de hex a decimal y aumentar un 10%
        networkConfig = {
          gasPrice, // gasPrice ya está en el formato correcto, no es necesario volver a aplicarlo a BigNumber
          gasLimit, // Usar el gasLimit específico para la acción, ya sea dinámico o fallback
        };
      } else if (networkName === 'POLYGON') {
        // Obtener fee data para Polygon
        const feeData = await provider.getFeeData();
        // Pruebo usar fees
        const gasPrice = feeData.gasPrice ? feeData.gasPrice.toString() : null;

        // Intentar obtener el valor de gas limit desde las variables de entorno, si existe, sobreescribir el fallback
        // MRM maxPriorityFee is hardcoded in Polygon
        networkConfig = {
          gasPrice,
          gasLimit, // Usar el gasLimit específico para la acción, ya sea dinámico o fallback
        };
      }
    }

    console.log(`${functionName} - networkConfig:`, networkConfig);
    return networkConfig;
  } catch (error) {
    const errorMessage = `${functionName} - Error fetching gas price or gas limit. Called with networkName=${networkName}, actionName=${actionName}. Error: ${error.message}`;
    console.error(errorMessage);

    // Valores por defecto en caso de error (ya inicializados con valores fallback)
    const fallbackConfig = {
      gasPrice: gasPriceFallback,
      gasLimit: gasLimitActionFallback[actionName], // Usar el gasLimit específico para la acción (fallback)
    };

    console.log(`${functionName} - Fallback networkConfig:`, fallbackConfig);
    return fallbackConfig;
  }
};

// Se sustituirá por transacción de OPERATOR (adaptada por ahora a DEPLOYER)
const setSmartContractRescueAcount = async function ({ vault, rescueWalletAccount }) {
  const blockchainContract = getDeployedContract(vault);
  const networkName = vault.contractNetwork;
  const networkConfig = await getGasPriceAndLimit(networkName, 'TRANSFER');
  const setTx1 = await blockchainContract.setRescueWalletAddress(
    rescueWalletAccount,
    networkConfig
  );
  await setTx1.wait();
  console.log('after: ' + (await blockchainContract.rescueWalletAddress()));
};

const fetchSavingsVaultBalances = async (vault) => {
  const networkName = vault.contractNetwork.toLowerCase();
  const safeAddress = vault.id;

  // Get decimals map for this network
  const decimalsMap = getCurrencyDecimalsMap(networkName);

  // Determine API URL based on network
  const apiBaseUrl = await getEnvVariable('SAFE_BASE_URL', networkName);

  let safeBalances;
  try {
    // Try Safe API first
    const response = await axios.get(`${apiBaseUrl}/api/v1/safes/${safeAddress}/balances`);
    safeBalances = response.data;
  } catch (error) {
    console.log('Safe API failed, falling back to direct contract calls:', error.message);

    // Get provider for the network
    const NETWORK_URL = await getEnvVariable('HARDHAT_API_URL', networkName);
    const provider = new hre.ethers.providers.JsonRpcProvider(NETWORK_URL);

    // Get token addresses for this network
    const tokenAddresses = [
      await getEnvVariable('USDC_TOKEN_ADDRESS', networkName),
      await getEnvVariable('USDT_TOKEN_ADDRESS', networkName),
      await getEnvVariable('USDM_TOKEN_ADDRESS', networkName),
      await getEnvVariable('WBTC_TOKEN_ADDRESS', networkName),
      await getEnvVariable('WETH_TOKEN_ADDRESS', networkName),
    ];

    // Create ERC20 interface
    const erc20Interface = new hre.ethers.utils.Interface([
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ]);

    // Fetch balances directly from contracts
    safeBalances = await Promise.all(
      tokenAddresses.map(async (tokenAddress) => {
        const contract = new hre.ethers.Contract(tokenAddress, erc20Interface, provider);
        const balance = await contract.balanceOf(safeAddress);
        const decimals = await contract.decimals();
        const symbol = await contract.symbol();

        return {
          tokenAddress,
          token: {
            symbol,
            decimals,
          },
          balance: balance.toString(),
        };
      })
    );

    // Filter out zero balances
    safeBalances = safeBalances.filter((balance) => !balance.balance.startsWith('0'));
  }

  // Initialize arrays for our formatted balances
  const formattedBalances = [];
  let totalUsdValue = 0;
  let totalArsValue = 0;

  // Get valuations for conversion rates
  const valuations = await getCurrenciesValuations();
  const usdToArsValuation = valuations.find(
    (valuation) =>
      valuation.currency === Types.CurrencyTypes.ARS &&
      valuation.targetCurrency === Types.CurrencyTypes.USD
  );

  // Process each token balance
  for (const tokenBalance of safeBalances) {
    const token = tokenBalance.token;
    const tokenAddress = tokenBalance.tokenAddress;
    if (!tokenAddress) continue;

    // Build map of token addresses to their normalized symbols
    const networkName = vault.contractNetwork.toUpperCase();
    const tokenAddressMap = new Map([
      [
        (await getEnvVariable('USDC_TOKEN_ADDRESS', networkName)).toLowerCase(),
        Types.CurrencyTypes.USDC,
      ],
      [
        (await getEnvVariable('USDT_TOKEN_ADDRESS', networkName)).toLowerCase(),
        Types.CurrencyTypes.USDT,
      ],
      [
        (await getEnvVariable('USDM_TOKEN_ADDRESS', networkName)).toLowerCase(),
        Types.CurrencyTypes.USDM,
      ],
      [(await getEnvVariable('WBTC_TOKEN_ADDRESS', networkName)).toLowerCase(), TokenTypes.WBTC],
      [(await getEnvVariable('WETH_TOKEN_ADDRESS', networkName)).toLowerCase(), TokenTypes.WETH],
    ]);

    // Get normalized symbol from token address
    const normalizedSymbol = tokenAddressMap.get(tokenAddress.toLowerCase());

    if (!normalizedSymbol) {
      console.warn(`Unknown token address: ${tokenAddress}`);
      continue; // Skip unknown tokens
    }

    // Use decimals from token response, fallback to decimalsMap if needed
    const decimals = token?.decimals ?? decimalsMap.get(normalizedSymbol);
    if (decimals === undefined) {
      console.warn(`No decimals found for token: ${tokenAddress}`);
      continue; // Skip tokens without decimals information
    }

    // Convert balance to number based on decimals
    const balance = parseFloat(hre.ethers.utils.formatUnits(tokenBalance.balance, decimals));

    // Find token valuation using normalized symbol
    const tokenValuation = valuations.find(
      (valuation) =>
        valuation.currency === normalizedSymbol &&
        valuation.targetCurrency === Types.CurrencyTypes.USD
    );

    // Calculate USD and ARS values
    const usdValue = balance * (tokenValuation?.value || 0);
    const arsValue = usdValue * (usdToArsValuation?.value || 0);

    // Add to totals
    totalUsdValue += usdValue;
    totalArsValue += arsValue;

    // Create formatted balance entry
    formattedBalances.push({
      currency: normalizedSymbol,
      balance,
      valuations: [
        {
          currency: Types.CurrencyTypes.USD,
          value: usdValue,
        },
        {
          currency: Types.CurrencyTypes.ARS,
          value: arsValue,
        },
      ],
    });
  }

  // Add summary valuations
  formattedBalances.push(
    {
      currency: Types.CurrencyTypes.USD,
      value: totalUsdValue,
      balance: totalUsdValue,
      isValuation: true,
    },
    {
      currency: Types.CurrencyTypes.ARS,
      value: totalArsValue,
      balance: totalArsValue,
      isValuation: true,
    }
  );

  return formattedBalances;
};

const fetchCreditVaultBalances = async (vault) => {
  console.log('fetchCreditVaultBalances- Dentro de fetchCreditVaultBalances ' + vault.id);
  console.log('fetchCreditVaultBalances- Vault version vale ' + vault.contractVersion);

  // Get the deployed contract.
  const blockchainContract = await getDeployedContract(vault);
  const contractBalances = await blockchainContract.getBalances();
  console.log('BALANCES FOR ' + vault.id + ': ' + JSON.stringify(contractBalances));
  let balancesWithCurrencies = [];

  const isMultiToken = vault.contractVersion === '2.0.0';
  let networkName;
  let decimalsMap;

  if (isMultiToken) {
    // Handle new version of the contract
    console.log('fetchCreditVaultBalances- Vault ' + vault.id + ' es multitoken');

    try {
      // Fetch the tokenNames array
      const tokenNames = await blockchainContract.getTokenNames();
      console.log('fetchCreditVaultBalances- tokenNames length: ' + tokenNames.length);
      console.log('fetchCreditVaultBalances- tokenNames: ' + JSON.stringify(tokenNames));

      // Fetch the contract balances (assuming this is needed for the new version as well)
      const contractBalances = await blockchainContract.getBalances();

      // Loop through tokenNames and fetch balances
      for (let i = 0; i < tokenNames.length; i++) {
        const tokenName = tokenNames[i];
        const tokenBalance = contractBalances[i + 1]; // i+1 porque 0 es el balance de token nativo

        const currencyType = Types.CurrencyTypes[tokenName];
        networkName = vault.contractNetwork;
        decimalsMap = getCurrencyDecimalsMap(networkName);
        const formattedBalance = parseFloat(
          Utils.formatUnits(tokenBalance, decimalsMap.get(currencyType))
        );

        console.log(
          'fetchCreditVaultBalances - Balance de ',
          tokenName,
          ' es ',
          tokenBalance,
          'que formateado es ',
          formattedBalance
        );

        balancesWithCurrencies.push({
          currency: currencyType,
          balance: formattedBalance,
        });
      }
    } catch (error) {
      console.error('Error fetching token names or balances:', error);
      throw error;
    }
  } else {
    // Handle old version of the contract
    // Old version is always polygon
    networkName = 'POLYGON';
    decimalsMap = getCurrencyDecimalsMap(networkName);
    balancesWithCurrencies = [
      {
        currency: Types.CurrencyTypes.USDC,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[1], decimalsMap.get(Types.CurrencyTypes.USDC))
        ), // 6 decimales
      },
      {
        currency: Types.CurrencyTypes.USDT,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[2], decimalsMap.get(Types.CurrencyTypes.USDT))
        ), // 6 decimales
      },
      {
        currency: Types.CurrencyTypes.USDM,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[3], decimalsMap.get(Types.CurrencyTypes.USDM))
        ), // 18 decimales
      },
      {
        currency: Types.CurrencyTypes.WBTC,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[4], decimalsMap.get(Types.CurrencyTypes.WBTC))
        ), // 8 decimales
      },
    ];
  }

  console.log(
    'fetchCreditVaultBalances - vault ',
    vault.id,
    ' - balancesWithCurrencies es ',
    JSON.stringify(balancesWithCurrencies)
  );
  const valuations = await getCurrenciesValuations();

  console.log('Valuations response:' + JSON.stringify(valuations));

  const balancesWithValuations = balancesToValuations(balancesWithCurrencies, valuations);

  console.log('Balances with valuations:' + JSON.stringify(balancesWithValuations));

  const sumarizedBalances = [];
  balancesWithValuations.forEach((balanceWithPrice) => {
    balanceWithPrice.valuations.forEach((valuation) => {
      const sumarizedBalance = sumarizedBalances.find((item) => {
        return item.currency === valuation.currency;
      });

      if (sumarizedBalance) {
        sumarizedBalance.balance += valuation.value;
      } else {
        sumarizedBalances.push({ ...valuation, balance: valuation.value, isValuation: true });
      }
    });
  });

  const allBalances = [...balancesWithValuations, ...sumarizedBalances];
  console.log('BALANCES WITH TOKEN FOR ' + vault.id + ': ' + JSON.stringify(allBalances));
  return allBalances;
};

const fetchVaultBalances = async (vault) => {
  if (vault.vaultType === 'savings') {
    return await fetchSavingsVaultBalances(vault);
  }
  return await fetchCreditVaultBalances(vault);
};

exports.getVaultBalances = async function (req, res) {
  const { id } = req.params;

  const { userId } = res.locals;
  const auditUid = userId;

  try {
    // [
    //   {
    //     currency: 'usdc',
    //     balance: 0.1,
    //     valuations: [
    //       { currency: 'usd', value: 0.1 },
    //       { currency: 'ars', value: 30 },
    //     ],
    //   },
    //   {
    //     currency: 'usdt',
    //     balance: 0,
    //     valuations: [
    //       { currency: 'usd', value: 0 },
    //       { currency: 'ars', value: 0 },
    //     ],
    //   },
    //   { currency: 'usd', value: 0.1, balance: 0.1, isValuation: true },
    //   { currency: 'ars', value: 30, balance: 30, isValuation: true },
    // ]
    console.log('Entro a getVaultBalances ' + id);
    const vault = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });
    const allBalances = await fetchVaultBalances(vault);
    console.log('getVaultBalances - La vault que estoy procesando es');
    console.log(vault.id);
    console.log(
      'getVaultBalances - Balances en la base es: ',
      JSON.stringify(vault.balances, null, 2)
    );
    console.log(
      'getVaultBalances - Balances obtenidos del contrato: ',
      JSON.stringify(allBalances, null, 2)
    );

    let balancesNeedUpdate = true;

    if (
      areNonRebasingTokensEqual(vault.balances, allBalances) &&
      areRebasingTokensEqualWithDiff(vault.balances, allBalances, 1)
    ) {
      console.log(
        'getVaultBalances - ',
        vault.id,
        ' - All Non Rebasing tokens balances are the same and rebasing within allowable difference'
      );
      balancesNeedUpdate = false;
    } else {
      console.log(
        'getVaultBalances - ',
        vault.id,
        ' - Non Rebasing tokens are different, or rebasing tokens outside allowable difference'
      );
      balancesNeedUpdate = true;
    }

    // actualizo y pongo flag de update si el balance cambió
    await updateSingleItem({
      collectionName: COLLECTION_NAME,
      data: { balances: allBalances, mustUpdate: balancesNeedUpdate, balancesUpdateRetries: 0 },
      auditUid,
      id: vault.id,
    });

    return res.status(200).send(allBalances);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const getCurrenciesValuations = async () => {
  return await fetchItems({ collectionName: COLLECTION_MARKET_CAP });
};

const balancesToValuations = (balancesWithToken, valuations) => {
  const newBalances = [];
  const usdToarsValuation = valuations.find(
    (item) =>
      item.currency === Types.CurrencyTypes.ARS && item.targetCurrency === Types.CurrencyTypes.USD
  );

  balancesWithToken.forEach((balanceWithToken) => {
    // Normalize token symbol
    let normalizedSymbol = balanceWithToken.currency;
    if (normalizedSymbol === 'acon18usdm') {
      normalizedSymbol = Types.CurrencyTypes.USDM;
    } else if (normalizedSymbol === 'acon6usdt') {
      normalizedSymbol = Types.CurrencyTypes.USDT;
    } else if (normalizedSymbol === 'acon6usdc') {
      normalizedSymbol = Types.CurrencyTypes.USDC;
    } else if (normalizedSymbol === 'acon8wbtc') {
      normalizedSymbol = TokenTypes.WBTC;
    } else if (normalizedSymbol === 'acon18weth') {
      normalizedSymbol = TokenTypes.WETH;
    }

    const usdValuation = valuations.find(
      (item) =>
        item.currency === normalizedSymbol && item.targetCurrency === Types.CurrencyTypes.USD
    );

    if (usdValuation) {
      const newBalance = {
        ...balanceWithToken,
        currency: normalizedSymbol, // Use normalized symbol
        valuations: [
          {
            currency: Types.CurrencyTypes.USD,
            value: usdValuation.value * balanceWithToken.balance,
          },
        ],
      };

      if (usdToarsValuation) {
        newBalance.valuations.push({
          currency: Types.CurrencyTypes.ARS,
          value: usdValuation.value * balanceWithToken.balance * usdToarsValuation.value,
        });
      }
      newBalances.push(newBalance);
    }
  });

  return newBalances;
};

// Se sustituirá por transacción de SAFE_LIQ (adaptada x ahora a DEPLOYER)
exports.withdraw = async function (req, res) {
  const { userId } = res.locals;
  const auditUid = userId;
  const { id, companyId, userId: targetUserId } = req.params;
  console.log('Empiezo withdraw - ' + req.params.id);

  const { amount, token } = req.body;

  try {
    if (!id || !token || !amount || !companyId || !targetUserId) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_ARGS',
        null,
        'Missing args (id/token/amount)',
        null
      );
    }

    /* TODO this was added to test the swap directly, we should take this to a new endpoint
    const db = admin.firestore();
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();
    swapVaultTokenBalances(doc.data());

    return;
     Here is how the code worked before
     */
    const smartContract = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });

    secureDataArgsValidation({
      data: smartContract,
      secureArgs: { userId: targetUserId, companyId },
    });

    const valuations = await getCurrenciesValuations();

    const usdToARSValuation = valuations.find((item) => {
      return (
        item.currency === Types.CurrencyTypes.ARS && item.targetCurrency === Types.CurrencyTypes.USD
      );
    });

    const tokenToUSDValuation = valuations.find((item) => {
      return item.currency === token && item.targetCurrency === Types.CurrencyTypes.USD;
    });

    if (!usdToARSValuation || !tokenToUSDValuation) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_VALUATION',
        null,
        'Missing valuations',
        null
      );
    }
    const withdrawInUSD = amount * tokenToUSDValuation.value;
    const withdrawInARS = withdrawInUSD * usdToARSValuation.value;

    if (withdrawInARS > smartContract.amount) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_AMOUNT',
        null,
        'El monto es superior al monto del crédito',
        null
      );
    }

    // Get the deployed contract
    const networkName = smartContract.contractNetwork;
    const decimalsMap = getCurrencyDecimalsMap(networkName);
    const blockchainContract = getDeployedContract(smartContract);
    const decimals = decimalsMap.get(token); // decimales
    const ethAmount = decimals ? Utils.parseUnits(amount, decimals) : Utils.parseEther(amount);
    console.log('Withdraw - tokens - ', JSON.stringify(token), ' cantidad ', ethAmount);
    const networkConfig = await getGasPriceAndLimit(networkName, 'TRANSFER');
    const tokenReference = getTokenReference(token);

    // dry run so if it fails it gives a reason, also transaction is not launch to avoid unnecesart money spending
    await blockchainContract.callStatic.withdraw(ethAmount, tokenReference, networkConfig);
    const wd = await blockchainContract.withdraw(ethAmount, tokenReference, networkConfig);
    await wd.wait();

    const withdrawTotalAmountARS = smartContract.withdrawTotalAmountARS
      ? smartContract.withdrawTotalAmountARS
      : 0;

    const withdrawTotalAmountUSD = smartContract.withdrawTotalAmountUSD
      ? smartContract.withdrawTotalAmountUSD
      : 0;
    console.log('withdraw - actualizo la bóveda con  el nuevo crédito ' + id);
    await updateSingleItem({
      collectionName: COLLECTION_NAME,
      id,
      auditUid,
      data: {
        withdrawTotalAmountARS: withdrawTotalAmountARS + withdrawInARS,
        withdrawTotalAmountUSD: withdrawTotalAmountUSD + withdrawInUSD,
        amount: smartContract.amount - withdrawInARS,
      },
    });

    // Refactor con otros mails
    const employee = await fetchSingleItem({ collectionName: Collections.USERS, id: auditUid });
    const lender = await fetchSingleItem({ collectionName: Collections.COMPANIES, id: companyId });
    const borrower = await fetchSingleItem({ collectionName: Collections.USERS, id: targetUserId });

    console.log('withdraw - mando mails de liquidación ' + id);
    await EmailSender.send({
      to: employee.email,
      message: null,
      template: {
        name: 'mail-liquidate',
        data: {
          username: employee.firstName + ' ' + employee.lastName,
          vaultId: id,
          lender: lender.name,
          value: withdrawInARS.toFixed(2),
          vaultType: smartContract.vaultType,
          creditType: smartContract.creditType,
          serviceLevel: smartContract.serviceLevel,
        },
      },
    });

    await EmailSender.send({
      to: SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-liquidate',
        data: {
          username: employee.firstName + ' ' + employee.lastName,
          vaultId: id,
          lender: lender.name,
          value: withdrawInARS.toFixed(2),
          vaultType: smartContract.vaultType,
          creditType: smartContract.creditType,
          serviceLevel: smartContract.serviceLevel,
        },
      },
    });

    await EmailSender.send({
      to: borrower.email,
      message: null,
      template: {
        name: 'mail-liquidate',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: id,
          lender: lender.name,
          value: withdrawInARS.toFixed(2),
          vaultType: smartContract.vaultType,
          creditType: smartContract.creditType,
          serviceLevel: smartContract.serviceLevel,
        },
      },
    });
    return res.status(200).send(null);
  } catch (err) {
    const parsedErr = getParsedEthersError(err);

    console.error('ERROR WITHDRAW:', JSON.stringify(parsedErr), err);

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

// Se sustituirá por transacción Safe de SAFE_LIQ como RESCUER (adaptada x ahora a DEPLOYER)
exports.rescue = async function (req, res) {
  const { userId } = res.locals;
  const auditUid = userId;
  const { id, companyId, userId: targetUserId } = req.params;

  const { amount, token } = req.body;

  try {
    if (!id || !token || !amount) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_ARGS',
        null,
        'Missing args (id/token/amount)',
        null
      );
    }

    const smartContract = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });

    if (!smartContract.balances || !smartContract.balances.length) {
      throw new CustomError.TechnicalError(
        'ERROR_EMPTY_BALANCE',
        null,
        'El contrato no tiene balances',
        null
      );
    }

    const arsBalance = smartContract.balances.find((balance) => {
      return balance.currency === Types.CurrencyTypes.ARS;
    });

    if (!arsBalance || !arsBalance.balance) {
      throw new CustomError.TechnicalError(
        'ERROR_ZERO_BALANCE',
        null,
        'El tiene balance cero en ARS',
        null
      );
    }

    secureDataArgsValidation({
      data: smartContract,
      secureArgs: { userId: targetUserId, companyId },
    });

    const valuations = await getCurrenciesValuations();

    const usdToARSValuation = valuations.find((item) => {
      return (
        item.currency === Types.CurrencyTypes.ARS && item.targetCurrency === Types.CurrencyTypes.USD
      );
    });

    const tokenToUSDValuation = valuations.find((item) => {
      return item.currency === token && item.targetCurrency === Types.CurrencyTypes.USD;
    });

    if (!usdToARSValuation || !tokenToUSDValuation) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_VALUATION',
        null,
        'Missing valuations',
        null
      );
    }

    const rescueInUSD = amount * tokenToUSDValuation.value;
    const rescueInARS = rescueInUSD * usdToARSValuation.value;

    const deposits = arsBalance.balance;

    if (rescueInARS > deposits - smartContract.amount) {
      console.error(
        'Los depósitos no pueden ser menores a los créditos (' +
          rescueInARS +
          ' > ' +
          deposits +
          ' - ' +
          smartContract.amount +
          ')'
      );
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_AMOUNT',
        null,
        'Los depósitos no pueden ser menores a los créditos (' +
          rescueInARS +
          ' > ' +
          deposits +
          ' - ' +
          smartContract.amount +
          ')',
        null
      );
    }

    // Get the deployed contract.
    const blockchainContract = getDeployedContract(smartContract);
    const networkName = smartContract.contractNetwork;
    const decimalsMap = getCurrencyDecimalsMap(networkName);
    const decimals = decimalsMap.get(token); // decimales
    const ethAmount =
      token === decimals ? Utils.parseUnits(amount, decimals) : Utils.parseEther(amount);
    const networkConfig = await getGasPriceAndLimit(networkName, 'TRANSFER');
    const tokenReference = getTokenReference(token);

    // Dry run it helps gettint the error reason and fails without spending money
    await blockchainContract.callStatic.rescue(ethAmount, tokenReference, networkConfig);
    const wd = await blockchainContract.rescue(ethAmount, tokenReference, networkConfig);
    await wd.wait();

    const rescueTotalAmountARS = smartContract.rescueTotalAmountARS
      ? smartContract.rescueTotalAmountARS
      : 0;

    const rescueTotalAmountUSD = smartContract.rescueTotalAmountUSD
      ? smartContract.rescueTotalAmountUSD
      : 0;

    await updateSingleItem({
      collectionName: COLLECTION_NAME,
      id,
      auditUid,
      data: {
        rescueTotalAmountARS: rescueTotalAmountARS + rescueInARS,
        rescueTotalAmountUSD: rescueTotalAmountUSD + rescueInUSD,
      },
    });

    // Refactor con otros mails
    const lender = await fetchSingleItem({ collectionName: Collections.COMPANIES, id: companyId });
    const borrower = await fetchSingleItem({ collectionName: Collections.USERS, id: targetUserId });

    // Guardo en que moneda estaba guardada en la boveda
    const currency = getTokenReference(token);

    await EmailSender.send({
      to: borrower.email,
      message: null,
      template: {
        name: 'mail-rescue',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: id,
          lender: lender.name,
          value: rescueInARS.toFixed(4),
          currency,
        },
      },
    });

    await EmailSender.send({
      to: SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-rescue',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: id,
          lender: lender.name,
          value: rescueInARS.toFixed(4),
          currency,
        },
      },
    });

    return res.status(200).send({ ethAmount });
  } catch (err) {
    const parsedErr = getParsedEthersError(err);

    console.error('ERROR ACA 6:', JSON.stringify(parsedErr));

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

const getVaultsToUpdate = async function () {
  const db = admin.firestore();
  const ref = db.collection(COLLECTION_NAME);

  console.log('getVaultsToUpdate - Consultando vaults para actualizar');
  const querySnapshot = await ref
    .where('state', '==', Types.StateTypes.STATE_ACTIVE)

    .where('loanStatus', 'in', [
      Types.LoanStatusTypes.LOAN_STATUS_TYPE_ACTIVE,
      Types.LoanStatusTypes.LOAN_STATUS_TYPE_DEFAULTER,
    ])
    .get();

  let vaults = [];

  if (querySnapshot.docs) {
    vaults = querySnapshot.docs.map((doc) => {
      const id = doc.id;
      const data = doc.data();
      data.createdAt = data.createdAt ? data.createdAt.toDate() : null;
      data.updatedAt = data.updatedAt ? data.updatedAt.toDate() : null;
      data.eventDate = data.eventDate ? data.eventDate.toDate() : null;
      data.eventCreationDate = data.eventCreationDate ? data.eventCreationDate.toDate() : null;

      return { id, ...data };
    });
  }
  // Extract vault IDs from the initial list for logging
  const vaultIdsToUpdate = vaults.map((vault) => vault.id);
  console.log(
    `getVaultsToUpdate - Initial list of vaults to update: ${
      vaults.length
    }, IDs: ${vaultIdsToUpdate.join(', ')}`
  );
  return vaults;
};

const getVaultsToEvaluate = async function () {
  // Retrieve vaults that potentially need updates
  const vaultsToUpdate = await getVaultsToUpdate();

  // Extract vault IDs from the initial list for logging
  const initialVaultIds = vaultsToUpdate.map((vault) => vault.id);
  console.log(
    `getVaultsToEvaluate - Initial list of vaults to Evaluate: ${
      vaultsToUpdate.length
    }, IDs: ${initialVaultIds.join(', ')}`
  );

  // Filter the vaults to identify those with volatile token balances
  // Duplicar código de getVaultsToUpdate adaptado?
  const tokens = Object.values(TokenTypes).map((token) => token.toString());

  const vaults = vaultsToUpdate.filter((vault) =>
    vault.balances.some((bal) => tokens.includes(bal.currency) && bal.balance > 0)
  );

  // Extract vault IDs from the filtered list for logging
  const filteredVaultIds = vaults.map((vault) => vault.id);
  console.log(
    `getVaultsToEvaluate - Filtered list of vaults con tokens volátiles a evaluar: ${
      vaults.length
    }, IDs: ${filteredVaultIds.join(', ')}`
  );

  return vaults;
};

const MAX_BALANCES_RETRIES = 5;
const markVaultsToUpdate = async function () {
  console.log('Starting markVaultsToUpdate');
  const db = admin.firestore();

  // Prepare batch operation
  const batch = db.batch();

  // Retrieve vaults that potentially need updates
  const vaults = await getVaultsToUpdate();

  // Initialize an array to keep track of the operations for logging purposes
  const batchOperations = [];

  vaults.forEach((vault) => {
    const ref = db.collection(COLLECTION_NAME).doc(vault.id);

    let balancesUpdateRetries = 0;
    if (vault.mustUpdate) {
      balancesUpdateRetries = vault.balancesUpdateCount ? vault.balancesUpdateCount + 1 : 1;
    } else balancesUpdateRetries = 0;

    if (MAX_BALANCES_RETRIES <= balancesUpdateRetries) {
      console.error('Max retries reached for contract ' + vault.id, JSON.stringify(vault));
    }

    const assistanceUpdateData = {
      mustUpdate: true,
      balancesUpdateCount: balancesUpdateRetries,
    };

    // Log each batch operation
    console.log('markVaultsToUpdate - Adding to the bach ', vault.id, assistanceUpdateData);
    batchOperations.push({ vaultId: vault.id, ...assistanceUpdateData });

    // Queue the update in the batch
    batch.update(ref, assistanceUpdateData);
  });

  // Log all batch operations before committing
  console.log('Batch operations queued:', JSON.stringify(batchOperations));

  // Commit the batch
  await batch.commit();
  console.log('Batch commit successful');
};

const MAX_EVALUATE_RETRIES = 5;
const markVaultsToEvaluate = async function () {
  const db = admin.firestore();
  const batch = db.batch();
  const vaults = await getVaultsToEvaluate();
  vaults.forEach((vault) => {
    const ref = db.collection(COLLECTION_NAME).doc(vault.id);

    let evaluateRetries = 0;
    if (vault.mustEvaluate) {
      evaluateRetries = vault.evaluationRetries ? vault.evaluationRetries + 1 : 1;
    } else evaluateRetries = 0;

    if (MAX_EVALUATE_RETRIES <= evaluateRetries) {
      console.error(
        'Max evaluation retries reached for contract ' + vault.id,
        JSON.stringify(vault)
      );
    }

    console.log(`Contract ${vault.id} marked for evaluation and balance update.`);
    const assistanceUpdateData = {
      mustEvaluate: true,
      evaluationRetries: evaluateRetries,
    };

    const updates = { ...assistanceUpdateData };

    batch.update(ref, updates);
  });

  await batch.commit();
};

exports.cronFetchVaultsBalances = functions
  .runWith({
    memory: '1GB',
    // timeoutSeconds: 540,
  })
  .pubsub.schedule('every 60 minutes')
  .timeZone('America/New_York') // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {
    try {
      await markVaultsToUpdate();

      LoggerHelper.appLogger({
        message: 'CRON cronFetchVaultBalances - OK',
        data: null,

        notifyAdmin: true,
      });
    } catch (err) {
      ErrorHelper.handleCronError({
        message: 'CRON cronFetchVaultBalances - ERROR: ' + err.message,
        error: err,
      });
    }
  });

// eslint-disable-next-line camelcase
const onVaultUpdate_ThenUpdateBalances = async ({ after, docId }) => {
  try {
    console.log(
      'onVaultUpdate_ThenUpdateBalances - after.mustUpdate ',
      after.mustUpdate,
      ' docId ',
      docId
    );
    if (!after.mustUpdate) return;

    const allBalances = await fetchVaultBalances({ ...after, id: docId });

    const updateData = {
      lastBalanceUpdate: admin.firestore.FieldValue.serverTimestamp(), // new Date(Date.now())
      mustUpdate: false,
      balancesUpdateRetries: 0,
      balances: allBalances,
    };

    // const db = admin.firestore();
    // const doc = await db.collection(COLLECTION_NAME).doc(docId).update(updateData);
    after.balances = allBalances;
    return updateData;
  } catch (e) {
    console.error('Error actualizando los balances del contrato ' + docId + '. ' + e.message);
    throw e;
  }
};

const getVaultCompanyEmployees = async (vault) => {
  const INDEXED_FILTERS = ['userId', 'companyId'];
  const filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  console.log(`Consultando Vault ${vault.id} CompanyEmployees`);
  const result = await listByPropInner({
    limit: 1000,
    offset: 0,
    filters,

    primaryEntityPropName: COMPANY_ENTITY_PROPERTY_NAME,
    primaryEntityValue: vault.companyId,
    primaryEntityCollectionName: Collections.COMPANIES,
    listByCollectionName: Collections.COMPANY_EMPLOYEES,
    indexedFilters: INDEXED_FILTERS,
    relationships: [{ collectionName: Collections.USERS, propertyName: USER_ENTITY_PROPERTY_NAME }],
  });

  return result.items
    ? result.items.filter((employee) =>
        employee.employeeRols.some(
          (rol) => rol === 'ENTERPRISE_ADMIN' || rol === 'ENTERPRISE_EMPLOYEE'
        )
      )
    : null;
};

const sendDepositEmails = async (vault, movementAmount) => {
  // TODO refactor along the others email sending into a generic fx (event, vault, args)
  console.log('Envio mails por depósito de cripto.');

  const lender = await fetchSingleItem({
    collectionName: Collections.COMPANIES,
    id: vault.companyId,
  });
  const borrower = await fetchSingleItem({
    collectionName: Collections.USERS,
    id: vault.userId,
  });
  const employees = await getVaultCompanyEmployees(vault);

  // Envio aviso a los employees de la companía
  employees.forEach((compEmployee) => {
    const employee = compEmployee.userId_SOURCE_ENTITIES[0];

    EmailSender.send({
      to: employee.email,
      message: null,
      template: {
        name: 'mail-cripto',
        data: {
          username: employee.firstName + ' ' + employee.lastName,
          vaultId: vault.id,
          lender: lender.name,
          value: movementAmount.toFixed(2),
          currency: 'ARS',
        },
      },
    });
  });

  EmailSender.send({
    to: SYS_ADMIN_EMAIL,
    message: null,
    template: {
      name: 'mail-cripto',
      data: {
        username: borrower.firstName + ' ' + borrower.lastName,
        vaultId: vault.id,
        lender: lender.name,
        value: movementAmount.toFixed(2),
        currency: 'ARS',
      },
    },
  });

  // Envio el email al borrower de esta boveda
  EmailSender.send({
    to: borrower.email,
    message: null,
    template: {
      name: 'mail-cripto',
      data: {
        username: borrower.firstName + ' ' + borrower.lastName,
        vaultId: vault.id,
        lender: lender.name,
        value: movementAmount.toFixed(2),
        currency: 'ARS',
      },
    },
  });
};

const sendCreditEmails = async (vault, beforeAmount) => {
  // TODO refactor along the others email sending into a generic fx (event, vault, args)
  console.log(
    'sendCreditEmails - Envio mails por modificación del monto del crédito.' +
      vault.id +
      ' before ' +
      beforeAmount +
      ' after ' +
      vault.amount
  );

  const movementAmount = formatMoneyWithCurrency(
    vault.amount,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
    'ars'
  );
  const bAmount = formatMoneyWithCurrency(
    beforeAmount,
    0,
    undefined,
    undefined,
    undefined,
    undefined,
    'ars'
  );

  const lender = await fetchSingleItem({
    collectionName: Collections.COMPANIES,
    id: vault.companyId,
  });
  const borrower = await fetchSingleItem({
    collectionName: Collections.USERS,
    id: vault.userId,
  });
  const employees = await getVaultCompanyEmployees(vault);

  // Envio aviso a los employees de la companía
  employees.forEach((compEmployee) => {
    const employee = compEmployee.userId_SOURCE_ENTITIES[0];

    EmailSender.send({
      to: employee.email,
      message: null,
      template: {
        name: 'mail-update',
        data: {
          username: employee.firstName + ' ' + employee.lastName,
          vaultId: vault.id,
          lender: lender.name,
          amountBefore: bAmount.toFixed(2),
          amount: movementAmount.toFixed(2),
        },
      },
    });
  });

  EmailSender.send({
    to: SYS_ADMIN_EMAIL,
    message: null,
    template: {
      name: 'mail-update',
      data: {
        username: borrower.firstName + ' ' + borrower.lastName,
        vaultId: vault.id,
        lender: lender.name,
        amountBefore: bAmount.toFixed(2),
        amount: movementAmount.toFixed(2),
      },
    },
  });

  // Envio el email al borrower de esta boveda
  EmailSender.send({
    to: borrower.email,
    message: null,
    template: {
      name: 'mail-update',
      data: {
        username: borrower.firstName + ' ' + borrower.lastName,
        vaultId: vault.id,
        lender: lender.name,
        amountBefore: bAmount.toFixed(2),
        amount: movementAmount.toFixed(2),
      },
    },
  });
};

const createVaultTransaction = async ({ docId, before, after, transactionType }) => {
  let movementType = 'plus';
  let movementAmount = 0;
  let movementCurrency = 'ARS'; // Default to ARS for backward compatibility
  const tokenChanges = []; // Add array to track token changes

  if (
    transactionType === VaultTransactionTypes.VAULT_CREATE ||
    transactionType === VaultTransactionTypes.BALANCE_NOTIFICATION
  ) {
    if (!before && after) {
      console.log(
        'transactionType:',
        transactionType,
        'proxyContractAddress:',
        JSON.stringify(after.proxyContractAddress),
        'after:',
        JSON.stringify(after)
      );
    }
  } else {
    if (
      before &&
      after &&
      before.balances &&
      after.balances &&
      typeof before.amount == 'number' &&
      typeof after.amount == 'number'
    ) {
      console.log(
        'transactionType:',
        transactionType,
        'proxyContractAddress:',
        JSON.stringify(after.proxyContractAddress),
        'before balances:',
        JSON.stringify(before.balances),
        'after balances:',
        JSON.stringify(after.balances),
        'before credit:',
        before.amount,
        'after credit:',
        after.amount
      );
    } else {
      throw new Error('Datos de balances faltantes para proceso de VaultTransactions en update');
    }

    if (
      transactionType !== VaultTransactionTypes.BALANCE_NOTIFICATION &&
      transactionType !== VaultTransactionTypes.VAULT_CREATE &&
      transactionType !== VaultTransactionTypes.CREDIT_UPDATE
    ) {
      // USD: calculo cambio del balance y signo.
      const beforeUSD = before.balances.find((balance) => {
        return balance.currency === Types.CurrencyTypes.USD;
      });
      const afterUSD = after.balances.find((balance) => {
        return balance.currency === Types.CurrencyTypes.USD;
      });

      if (
        beforeUSD &&
        afterUSD &&
        typeof afterUSD.balance === 'number' &&
        typeof beforeUSD.balance === 'number'
      ) {
        movementAmount = afterUSD.balance - beforeUSD.balance;
        movementCurrency = 'USD';

        // Track token changes - only for non-valuation balances and known currencies
        before.balances.forEach((bBalance) => {
          if (!bBalance.isValuation && bBalance.currency !== 'n/a') {
            const aBalance = after.balances.find(
              (aBalance) => aBalance.currency === bBalance.currency
            );

            if (aBalance && bBalance.balance !== aBalance.balance) {
              tokenChanges.push({
                currency: bBalance.currency,
                beforeBalance: bBalance.balance,
                afterBalance: aBalance.balance,
                difference: aBalance.balance - bBalance.balance,
                valuations: aBalance.valuations,
              });
            }
          }
        });

        if (movementAmount < 0) movementAmount = movementAmount * -1;
        if (beforeUSD.balance > afterUSD.balance) {
          movementType = 'minus';
        }
      }

      // crypto-update: si hay cambio en el balance de algún token.
      const isCryptoUpdate = before.balances.some((bBalance) => {
        if (!bBalance.isValuation) {
          const aBalance = after.balances.find(
            (aBalance) => aBalance.currency === bBalance.currency
          );
          // Add null check before accessing balance
          return aBalance ? bBalance.balance !== aBalance.balance : true;
        }
        return false;
      });

      if (isCryptoUpdate) {
        transactionType = VaultTransactionTypes.CRYPTO_UPDATE;
        const tokenOut = await getTokenOut(before.contractNetwork);

        const tokens = Object.values(TokenTypes).map((token) => token.toString());
        console.log('Tokens volátiles: ', tokens);

        const hasAnyLowerTokenBalance = before.balances.some((bBalance) => {
          if (!bBalance.isValuation && tokens.includes(bBalance.currency)) {
            const afterBalance = after.balances.find(
              (aBalance) => aBalance.currency === bBalance.currency
            );
            return bBalance.balance > afterBalance.balance;
          }
          return false;
        });

        const hasMoreTokenOutBalance = before.balances.some((bBalance) => {
          if (!bBalance.isValuation && bBalance.currency === tokenOut.symbol) {
            const afterBalance = after.balances.find(
              (aBalance) => aBalance.currency === bBalance.currency
            );
            return bBalance.balance < afterBalance.balance;
          }
        });

        if (hasAnyLowerTokenBalance && hasMoreTokenOutBalance) {
          transactionType = VaultTransactionTypes.CRYPTO_SWAP;
          // movementType = 'swap'
          movementAmount = 0; // movementAmount = aTokenOut - bTokenOut
        }
      }
    }

    if (transactionType === VaultTransactionTypes.CREDIT_UPDATE) {
      if (typeof after.amount === 'number' && typeof before.amount === 'number') {
        movementAmount = after.amount - before.amount;
        movementCurrency = 'ARS'; // Credit updates are always in ARS
        if (movementAmount < 0) movementAmount = movementAmount * -1;
        if (before.amount > after.amount) {
          movementType = 'minus';
        }
        await sendCreditEmails(after, before.amount);
      }
    }
  }

  // Mails ingreso crypto
  if (transactionType === VaultTransactionTypes.CRYPTO_UPDATE && movementType === 'plus') {
    console.log('Mail ingreso crypto ', after.balances, '  ', movementAmount);
    await sendDepositEmails(after, movementAmount);
  }

  // Creacion VaultTransaction
  const createData = {
    ...after,
    vaultId: docId,
    movementType,
    movementAmount,
    movementCurrency,
    transactionType,
    tokenChanges, // Add token changes to the transaction record
    contractDeployment: null,
    proxyContractDeployment: null,
    state: Types.StateTypes.STATE_ACTIVE,
    ...creationStruct('admin'),
  };

  delete createData.id;
  delete createData.contractDeployment;
  delete createData.proxyContractDeployment;

  console.log('Creando transaccion: (' + transactionType + ')' + JSON.stringify(createData));

  const db = admin.firestore();
  const doc = await db.collection(Collections.VAULT_TRANSACTIONS).doc().set(createData);
};

// eslint-disable-next-line camelcase
const onVaultUpdate_ThenCreateTransaction = async ({ before, after, docId, documentPath }) => {
  try {
    console.log(
      'onVaultUpdate_ThenCreateTransaction - after.mustUpdate ',
      after.mustUpdate,
      ' after.mustEvaluate ',
      after.mustEvaluate,
      ' docId ',
      docId
    );

    if (!before.balances && !after.balances) {
      console.log('onVaultUpdate_ThenCreateTransaction - No hay información de balances ' + docId);
      return;
    }

    // MRM Junio 2024 agrego flag update false en la condición para evitar CRYPTO_UPDATE duplicados
    if (before.balances.length !== after.balances.length && after.mustUpdate) {
      console.log(
        'onVaultUpdate_ThenCreateTransaction - Son distintos por cantidad de activos ' + docId
      );
      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.BALANCE_UPDATE,
      });
      return;
    }

    // MRM Junio 2024 agrego flag update false en la condición para evitar CRYPTO_UPDATE duplicados
    if (JSON.stringify(before.balances) !== JSON.stringify(after.balances) && after.mustUpdate) {
      console.log('onVaultUpdate_ThenCreateTransaction Son distintos por balance ' + docId);

      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.BALANCE_UPDATE,
      });
      return;
    }

    // MRM Junio 2024 agrego flag update false en la condición para evitar CRYPTO_UPDATE duplicados
    if (!before.balances && after.balances && after.mustUpdate) {
      console.log('onVaultUpdate_ThenCreateTransaction - Balance Nuevo ' + docId);
      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.BALANCE_UPDATE,
      });
      return;
    }

    if (before.amount !== after.amount) {
      console.log('onVaultUpdate_ThenCreateTransaction - Actualización de crédito ' + docId);
      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.CREDIT_UPDATE,
      });
      return;
    }
    console.log('onVaultUpdate_ThenCreateTransaction - Ninguna transacción identificada ' + docId);
  } catch (e) {
    console.error('Error creando la transaccion ' + docId + '. ' + e.message);
    throw e;
  }
};

// eslint-disable-next-line camelcase
const onVaultUpdate_ThenEvaluateBalances = async ({ after, docId }) => {
  try {
    console.log(
      'onVaultUpdate_ThenEvaluateBalances - after.mustEvaluate ',
      after.mustEvaluate,
      ' docId ',
      docId
    );
    if (!after.mustEvaluate) return;
    console.log(`Evaluación contrato ${docId}`);

    // Evaluo boveda
    const evaluation = await evaluateVaultTokenBalance({ ...after, id: docId });

    let updateData = {
      lastEvaluation: Date.now(), // admin.firestore.FieldValue.serverTimestamp(),
      mustEvaluate: false,
      evaluationRetries: 0,
      pendingSwap: false,
    };

    // Acciono si se requiere.
    if (evaluation.actionType === ActionTypes.NOTIFICATION) {
      await sendVaultEvaluationEmail(evaluation);
      await createVaultTransaction({
        docId,
        before: null,
        after,
        transactionType: VaultTransactionTypes.BALANCE_NOTIFICATION,
      });
    }

    if (evaluation.actionType === ActionTypes.SWAP) {
      try {
        const tokenSwapsResult = await swapVaultTokenBalances(evaluation.vault);
        evaluation.swap.tokenOutAmount = tokenSwapsResult.tokenOutAmount;

        await sendVaultEvaluationEmail(evaluation);
      } catch (err) {
        // Si tiene +3 retries entonces se evaluará de nuevo en la próxima actualización de cotizaciones tokens (1h).
        console.error(
          `Error swapeando tokens de Vault ${evaluation.vault.id}: ${err.message}`,
          err
        );

        if (evaluation.vault.evaluationRetries > 3) {
          console.log(
            'Bóveda con +3 retries de swap; se volverá a evaluar en la próxima actualización de cotización tokens'
          );
          updateData = {
            lastEvaluation: Date.now(),
            mustEvaluate: false,
            evaluationRetries: 0,
            pendingSwap: true,
          };
        } else {
          updateData = {
            lastEvaluation: Date.now(),
            mustEvaluate: true,
            evaluationRetries: evaluation.vault.evaluationRetries + 1,
            pendingSwap: true,
          };
        }
      }
    }

    console.log('onVaultUpdate post vault evaluation' + docId);
    return updateData;
  } catch (e) {
    console.error('Error evaluando los balances del contrato ' + docId + '. ' + e.message);
    throw e;
  }
};

exports.onVaultUpdate = functions.firestore
  .document(COLLECTION_NAME + '/{docId}')
  .onUpdate(async (change, context) => {
    const { docId } = context.params;
    const documentPath = `${COLLECTION_NAME}/${docId}`;
    const before = change.before.data();
    const after = change.after.data();

    try {
      console.log(
        'onVaultUpdate ' +
          documentPath +
          ' differences ' +
          JSON.stringify(getDifferences(before, after))
      );

      const balanceUpdateData = await onVaultUpdate_ThenUpdateBalances({ after, docId });
      const evaluateUpdateData = await onVaultUpdate_ThenEvaluateBalances({ after, docId });
      await onVaultUpdate_ThenCreateTransaction({ before, after, docId });

      const updateData = { ...balanceUpdateData, ...evaluateUpdateData };
      console.log('onVaultUpdate ' + documentPath + ' updateData ' + JSON.stringify(updateData));
      if (Object.keys(updateData).length > 0) {
        console.log('onVaultUpdate actualizando ', updateData);
        const db = admin.firestore();
        await db.collection(COLLECTION_NAME).doc(docId).update(updateData);

        // Guardar en el histórico de balances si hay nuevos balances
        if (balanceUpdateData?.balances) {
          await createFirestoreDocument({
            collectionName: COLLECTION_VAULTS_BALANCE_HISTORY,
            itemData: {
              vaultId: docId,
              timestamp: new Date(),
              balances: balanceUpdateData.balances,
            },
            auditUid: 'system', // Como es una función automática, usamos 'system' como auditUid
          });
        }
      }
      console.log('onVaultUpdate success ' + documentPath);
    } catch (err) {
      console.error('error onVaultUpdate document', documentPath, err);
      return null;
    }
  });

exports.onVaultCreate = functions.firestore
  .document(COLLECTION_NAME + '/{docId}')
  .onCreate(async (snapshot, context) => {
    const { docId } = context.params;
    // const docId = snapshot.key;
    const documentPath = `${COLLECTION_NAME}/${docId}`;
    try {
      const before = null;
      const after = snapshot.data();

      console.log('onVaultCreate ' + documentPath);

      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.VAULT_CREATE,
      });
      await sendCreateEmails(after);

      console.log('onVaultCreate success ' + documentPath);
    } catch (err) {
      console.error('error onCreate document', documentPath, err);

      return null;
    }
  });

const sendCreateEmails = async (vault) => {
  // TODO refactor along the others email sending into a generic fx (event, vault, args)
  console.log(`Sending Vault ${vault.id} emails on creation`);

  const employee = await fetchSingleItem({
    collectionName: Collections.USERS,
    id: vault.createdBy,
  });
  const borrower = await fetchSingleItem({ collectionName: Collections.USERS, id: vault.userId });
  const lender = await fetchSingleItem({
    collectionName: Collections.COMPANIES,
    id: vault.companyId,
  });

  await EmailSender.send({
    to: employee.email,
    message: null,
    template: {
      name: 'mail-vault',
      data: {
        username: employee.firstName + ' ' + employee.lastName,
        vaultId: vault.id,
        lender: lender.name,
      },
    },
  });

  await EmailSender.send({
    to: SYS_ADMIN_EMAIL,
    message: null,
    template: {
      name: 'mail-vault',
      data: {
        username: employee.firstName + ' ' + employee.lastName,
        vaultId: vault.id,
        lender: lender.name,
      },
    },
  });

  await EmailSender.send({
    to: borrower.email,
    message: null,
    template: {
      name: 'mail-vault',
      data: {
        username: borrower.firstName + ' ' + borrower.lastName,
        vaultId: vault.id,
        lender: lender.name,
      },
    },
  });
};

const getVaultLimits = (vault, ratios) => {
  console.log(`Obtengo límites para vault ${vault.id}`);
  console.log('Los ratios son ', ratios);
  // Sumo el balance en ARS de cada token multiplicado por su actionType's ratio, en cada uno de los balances que no sea valuación
  const notificationLimit = vault.balances.reduce((limit, bal) => {
    if (!bal.isValuation) {
      const ratio = ratios.find(
        (ratio) => ratio.currency === bal.currency && ratio.actionType === ActionTypes.NOTIFICATION
      ).ratio;
      const tokenValuation = bal.valuations.find(
        (val) => val.currency === Types.CurrencyTypes.ARS
      ).value;
      return limit + tokenValuation * ratio;
    }
    return limit;
  }, 0);
  console.log(`Notification limit de vault ${vault.id}: ${Number(notificationLimit).toFixed(2)}`);

  const actionLimit = vault.balances.reduce((limit, bal) => {
    if (!bal.isValuation) {
      const ratio = ratios.find(
        (ratio) => ratio.currency === bal.currency && ratio.actionType === ActionTypes.SWAP
      ).ratio;
      const tokenValuation = bal.valuations.find(
        (val) => val.currency === Types.CurrencyTypes.ARS
      ).value;
      return limit + tokenValuation * ratio;
    }
    return limit;
  }, 0);
  console.log(`Action limit de vault ${vault.id}: ${Number(actionLimit).toFixed(2)}`);

  return {
    notificationLimit: Number(notificationLimit.toFixed(2)),
    actionLimit: Number(actionLimit.toFixed(2)),
  };
};

exports.findVaultsLimitsByUser = async (req, res) => {
  const { userId } = req.params;
  const { limit, offset } = req.query;

  let { filters } = req.query;
  if (!filters) filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  const tokens = Object.values(TokenTypes).map((token) => token.toString());
  console.log('tokens', tokens);

  try {
    const result = await listByPropInner({
      limit,
      offset,
      filters,

      primaryEntityPropName: USER_ENTITY_PROPERTY_NAME,
      primaryEntityValue: userId,
      primaryEntityCollectionName: Collections.USERS,
      listByCollectionName: COLLECTION_NAME,
      indexedFilters: INDEXED_FILTERS,

      postProcessor: async (items) => {
        const allItems = items.items
          .map((vault) => {
            if (vault.balances.some((bal) => tokens.includes(bal.currency) && bal.balance > 0)) {
              if (vault.dueDate) vault.dueDate = vault.dueDate.toDate();
              return vault;
            }
            return null;
          })
          .filter((item) => (item ? true : false));

        items.items = allItems;
        return items;
      },
    });
    const tokenRatios = await fetchTokenRatios();
    const vaultsLimits = [];

    for (const vault of result.items) {
      const arsLimits = getVaultLimits(vault, tokenRatios);
      vaultsLimits.push({ vaultId: vault.id, limits: arsLimits });
    }

    return res.send({ items: vaultsLimits });
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.findVaultsLimitsByCompany = async (req, res) => {
  const { companyId } = req.params;
  const { limit, offset } = req.query;

  let { filters } = req.query;
  if (!filters) filters = {};
  if (!filters.state) filters.state = { $equal: Types.StateTypes.STATE_ACTIVE };

  const tokens = Object.values(TokenTypes).map((token) => token.toString());

  try {
    const result = await listByPropInner({
      limit,
      offset,
      filters,

      primaryEntityPropName: COMPANY_ENTITY_PROPERTY_NAME,
      primaryEntityValue: companyId,
      primaryEntityCollectionName: Collections.COMPANIES,
      listByCollectionName: COLLECTION_NAME,
      indexedFilters: INDEXED_FILTERS,

      postProcessor: async (items) => {
        const allItems = items.items
          .map((vault) => {
            if (vault.balances.some((bal) => tokens.includes(bal.currency) && bal.balance > 0)) {
              if (vault.dueDate) vault.dueDate = vault.dueDate.toDate();
              return vault;
            }
            return null;
          })
          .filter((item) => (item ? true : false));

        items.items = allItems;
        return items;
      },
    });

    const tokenRatios = await fetchTokenRatios();
    const vaultsLimits = [];

    for (const vault of result.items) {
      const arsLimits = getVaultLimits(vault, tokenRatios);
      vaultsLimits.push({ vaultId: vault.id, limits: arsLimits });
    }

    return res.send({ items: vaultsLimits });
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const evaluateVaultTokenBalance = async (vault) => {
  const tokenRatios = await fetchTokenRatios();
  const arsLimits = getVaultLimits(vault, tokenRatios);
  const arsCredit = vault.amount;
  console.log(
    ' Obtenidos los limites de ',
    vault.id,
    ' notification ',
    arsLimits.notificationLimit,
    ' action limit ',
    arsLimits.actionLimit,
    ' credito ',
    arsCredit
  );

  const evaluation = {
    arsLimits,
    vault,
    swap: {
      tokenOutAmount: 0,
    },
  };

  // Comparo el crédito con los límites y clasifico la bóveda.
  if (arsCredit < arsLimits.notificationLimit) {
    console.log(`Vault ${vault.id} evaluada sin acción`);
    evaluation.actionType = null;
  } else if (arsCredit >= arsLimits.actionLimit) {
    console.log(`Vault ${vault.id} evaluada con acción SWAP`);
    evaluation.actionType = ActionTypes.SWAP;
  } else {
    console.log(`Vault ${vault.id} evaluada con acción NOTIFICATION`);
    evaluation.actionType = ActionTypes.NOTIFICATION;
  }

  return evaluation;
};

const fetchTokenRatios = async () => {
  // refactor content a ABM TokenRatios y hacer call?
  const limit = 1000;
  const offset = '0';
  const tokenRatios = await fetchItems({
    collectionName: COLLECTION_TOKEN_RATIOS,
    limit,
    offset,
  });

  return tokenRatios;
};

const sendVaultEvaluationEmail = async (evalVault) => {
  // TODO refactor along the others email sending into a generic fx (event, vault, args)

  const lender = await fetchSingleItem({
    collectionName: Collections.COMPANIES,
    id: evalVault.vault.companyId,
  });
  const borrower = await fetchSingleItem({
    collectionName: Collections.USERS,
    id: evalVault.vault.userId,
  });

  const usdBalance = evalVault.vault.balances.find(
    (item) => item.currency === 'usd' && item.isValuation === true
  );

  // Inicializar variables
  const usdStablesSum = getUsdStableValue(evalVault.vault.balances);
  const usdVolatileSum = getUsdVolatileValue(evalVault.vault.balances);

  const ARSrequiredIncrease = evalVault.vault.amount - evalVault.arsLimits.notificationLimit;
  console.log(`evalVault vale ${JSON.stringify(evalVault)}`);

  if (evalVault.actionType === ActionTypes.NOTIFICATION) {
    console.log(`Enviando mail de acción NOTIFICATION para vault ${evalVault.vault.id}`);
    await EmailSender.send({
      to: borrower.email,
      SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-mc2',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: evalVault.vault.id,
          lender: lender.name,
          requiredCryptoValue: formatMoneyWithCurrency(
            ARSrequiredIncrease,
            2,
            undefined,
            undefined,
            'ars'
          ),
          loan: formatMoneyWithCurrency(evalVault.vault.amount, 2, undefined, undefined, 'ars'),
          cryptoValue: formatMoneyWithCurrency(usdBalance.balance, 2, undefined, undefined, 'usd'),
          volatileCryptoValue: formatMoneyWithCurrency(
            usdVolatileSum,
            2,
            undefined,
            undefined,
            'usd'
          ),
          stableCryptoValue: formatMoneyWithCurrency(usdStablesSum, 2, undefined, undefined, 'usd'),
        },
      },
    });
  } else if (evalVault.actionType === ActionTypes.SWAP) {
    console.log(`Enviando mail de acción SWAP para vault ${evalVault.vault.id}`);
    await EmailSender.send({
      to: borrower.email,
      SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-swap',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: evalVault.vault.id,
          lender: lender.name,
          value: evalVault.swap.tokenOutAmount.toFixed(2),
        },
      },
    });
  }
};

const swapVaultExactInputs = async (vault, swapsParams) => {
  try {
    console.log(`Entro a swapVaultExactInputs`);
    console.log(`swapVaultExactInputs - vault.id ${vault.id}`);
    console.log(`swapVaultExactInputs - swapsParams`);
    console.log(swapsParams);

    const contractJson = require('../../../artifacts/contracts/' +
      vault.contractName +
      '.sol/' +
      vault.contractName +
      '.json');
    const abi = contractJson.abi;
    const HARDHAT_API_URL = await getEnvVariable('HARDHAT_API_URL', vault.contractNetwork);
    const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
    const SWAPPER_PRIVATE_KEY = await getEnvVariable('SWAPPER_PRIVATE_KEY', vault.contractNetwork);
    const signer = new hre.ethers.Wallet(SWAPPER_PRIVATE_KEY, alchemy);
    const swaperAddress = await signer.getAddress();
    const blockchainContract = new hre.ethers.Contract(vault.id, abi, signer);

    let swapsGasEstimation = hre.ethers.BigNumber.from('0');
    const gasEstimateFallback = hre.ethers.BigNumber.from('500000');

    for (const swap of swapsParams) {
      try {
        console.log(`swapVaultExactInputs - Swap details: ${JSON.stringify(swap, null, 2)}`);

        if (swap.params.recipient.toLowerCase() !== vault.id.toLowerCase()) {
          throw new Error(
            `Swapper Params recipient ${swap.params.recipient} is not the vault ${vault.id}`
          );
        }

        console.log('swapVaultExactInputs - Estimating gas with estimateGas');
        const gasEstimate = await blockchainContract.estimateGas.swapExactInputs([swap]);
        console.log('swapVaultExactInputs - Gas estimate:', gasEstimate.toString());

        swapsGasEstimation = swapsGasEstimation.add(gasEstimate);
        console.log(
          'swapVaultExactInputs - Total accumulated gas estimate:',
          swapsGasEstimation.toString()
        );
      } catch (error) {
        console.error(
          `Error estimating gas for swap: ${
            error.message
          }. Using fallback gas estimate of ${gasEstimateFallback.toString()}`
        );

        swapsGasEstimation = swapsGasEstimation.add(gasEstimateFallback);
        console.log(
          'swapVaultExactInputs - Total accumulated gas estimate with fallback:',
          swapsGasEstimation.toString()
        );
      }
    }

    console.log(
      'swapVaultExactInputs - Final total gas estimation for all swaps:',
      swapsGasEstimation.toString()
    );
    const networkName = vault.contractNetwork;
    const networkConfig = await getGasPriceAndLimit(networkName, 'SWAP');
    console.log('swapVaultExactInputs - swapsParams', JSON.stringify(swapsParams));
    console.log('swapVaultExactInputs - networkConfig', JSON.stringify(networkConfig));

    const balance = await alchemy.getBalance(swaperAddress);
    const maxGasToPay = networkConfig.gasLimit;
    if (hre.ethers.BigNumber.from(balance).lt(maxGasToPay)) {
      throw new Error(
        `swapVaultExactInputs - Swapper Address ${swaperAddress} does not have enough balance (${balance}) to pay ${maxGasToPay.toString()} wei for gas`
      );
    }

    const deadline = swapsParams[0].params.deadline;
    const blockTimestamp = (await alchemy.getBlock('latest')).timestamp;
    if (blockTimestamp > deadline) {
      throw new Error('swapVaultExactInputs - Transaction expired, old deadline');
    }

    await blockchainContract.callStatic.swapExactInputs(swapsParams, networkConfig);

    const swap = await blockchainContract.swapExactInputs(swapsParams, networkConfig);
    console.log('swapVaultExactInputs - Transaction Hash:', swap.hash);

    const tx = await swap.wait();

    if (!tx.status) {
      console.log('swapVaultExactInputs - Swap failed tx:', JSON.stringify(tx));
      const errEvents = tx.events?.filter((event) => event.event === 'SwapError');
      throw new Error(`swapVaultExactInputs - Swap Error Events: ${JSON.stringify(errEvents)}`);
    } else {
      console.log('swapVaultExactInputs - Swap tx:', JSON.stringify(tx));
    }

    const tokenOut = await getTokenOut(vault.contractNetwork);
    const tokens = await getTokens(vault.contractNetwork);
    const swapEvents = tx.events.filter((event) => event.event === 'Swap');
    const swapsResults = swapEvents.map((event) => {
      const [tokenIn, swapTokenOut, amountIn, amountOut] = event.args;
      const token = Object.values(tokens).find((token) => token.address === tokenIn);
      const amountInDec = Number(Utils.formatUnits(amountIn.toString(), token.decimals));
      const amountOutDec = Number(Utils.formatUnits(amountOut.toString(), tokenOut.decimals));
      console.log(
        `Vault ${vault.id} swapped ${amountInDec} of ${token.symbol} for ${amountOutDec} of ${tokenOut.symbol}`
      );

      return {
        token,
        amountInDec,
        amountOutDec,
        tokenOut,
      };
    });
    return swapsResults;
  } catch (error) {
    throw new Error(error);
  }
};

const buildSwapsParams = async (swapsData) => {
  // V1 internal swap function builder.
  // Quote tokenIn x amountIn of each swap for amountOutMinimum (slippage).
  console.log('Dentro de buildSwapsParams - swapsData', swapsData);
  const quoteAmounts = JSON.stringify(
    swapsData.reduce((prev, curr) => {
      prev[curr.tokenIn.symbol] = curr.amountIn;
      return prev;
    }, {})
  );

  const apiResponse = await invoke_get_api({
    endpoint: `${API_PATH_QUOTES}/${quoteAmounts}`,
  });

  if (!apiResponse || !apiResponse.data || apiResponse.errors.length > 0) {
    throw new CustomError.TechnicalError(
      'ERROR_UNISWAP_PATH_QUOTES_INVALID_RESPONSE',
      null,
      `Invalid response from Uniswap Path quotes service for quoteAmounts ${quoteAmounts}`,
      null
    );
  }
  const quotes = apiResponse.data;

  // Build swap objects asynchronously
  const swapParamsPromises = swapsData.map(async (swapData) => {
    const tokenIn = swapData.tokenIn;
    const tokenOut = swapData.tokenOut;
    const staticPaths = await getStaticPaths(swapData.netWork);
    const path = encodePath(staticPaths[tokenIn.symbol].tokens, staticPaths[tokenIn.symbol].fees);
    const amountIn = hre.ethers.BigNumber.from(
      Utils.parseUnits(swapData.amountIn.toString(), tokenIn.decimals)
    );

    // Apply slippage
    const quote = quotes[tokenIn.symbol];

    if (quote <= 0) {
      console.log(
        `Quote for swapping token ${tokenIn.symbol} with amount ${swapData.amountIn} is 0. Swap disregarded.`
      );
      return null; // Return null to filter out later
    }

    // Calculate amountOutMinimum considering slippage
    const slippageTolerance = 0.995;
    const amountOutMinimumDecimal = swapData.amountIn * quote * slippageTolerance;
    console.log(
      'buildSwapsParams - swapData.amountIn - ',
      swapData.amountIn,
      ' quote ',
      quote,
      ' slippageTolerance',
      slippageTolerance
    );

    // Convert amountOutMinimumDecimal to BigNumber with tokenOut decimals
    const amountOutMinimum = hre.ethers.BigNumber.from(
      Utils.parseUnits(amountOutMinimumDecimal.toFixed(tokenOut.decimals), tokenOut.decimals)
    );

    console.log('buildSwapsParams - amountOutMinimum - ', amountOutMinimum);
    const swapOptions = await getSwapOptions(swapData.netWork);

    return {
      params: {
        path,
        recipient: swapData.recipient,
        deadline: swapOptions.deadline(),
        amountIn,
        amountOutMinimum: hre.ethers.BigNumber.from(amountOutMinimum),
      },
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
    };
  });

  // Await all promises and filter out any null results
  const resolvedSwapParams = (await Promise.all(swapParamsPromises)).filter(
    (swapParams) => swapParams !== null
  );

  return resolvedSwapParams;
};

const swapVaultTokenBalances = async (vault) => {
  // Swapea todos los balances de tokens volátiles por TokenOut en config file.
  console.log('Entro a swapVaultTokenBalances - para bóveda ', vault.id);
  // Obtengo balances de tokens volátiles
  const tokenTypes = Object.values(TokenTypes).map((token) => token.toString());
  const tokenBalances = vault.balances.filter(
    (bal) => !bal.isValuation && tokenTypes.includes(bal.currency) && bal.balance > 0
  );

  // Preparo swaps para el monto total de cada balance
  const tokenOut = await getTokenOut(vault.contractNetwork);
  const tokens = await getTokens(vault.contractNetwork);
  const swapsData = tokenBalances.map((bal) => {
    console.log(`Balance de token ${bal.currency} a swapear: ${bal.balance}`);

    return {
      recipient: vault.id, // vault.proxyContractAddress
      tokenIn: tokens[bal.currency],
      tokenOut,
      amountIn: bal.balance,
      netWork: vault.contractNetwork,
    };
  });

  const swapsParams = await buildSwapsParams(swapsData);

  if (!swapsParams || swapsParams.length == 0) {
    console.log('No se logro construir ningún swap');
    return { tokenOutAmount: 0 };
  }

  console.log('Se construyeron - ', swapsParams.length, ' swaps para la bóveda ', vault.id);

  // Ejecuto swaps
  const swapsResults = await swapVaultExactInputs(vault, swapsParams);

  // Sumar los montos resultantes y devolverlos pal mail sender.
  const tokenOutAmount = swapsResults.reduce(
    (tokenOutAmount, swapResult) => tokenOutAmount + swapResult.amountOutDec,
    0
  );
  return { tokenOutAmount };
};

exports.evaluate = async function (req, res) {
  try {
    console.log('evaluate - Pedido de evaluación de vaults entrante.');
    await markVaultsToEvaluate();
    return res.status(200).send('evaluate - Ok: vaults marcadas para evaluar');
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.createVaultAdmin = async (req, res) => {
  try {
    console.log(' Comienzo createVaultAdmin');
    console.log(' Comienzo createVaultAdmin req ', JSON.stringify(req.body));
    const { safeLiq1, safeLiq3 } = req.body.data;
    // Validar owners de Polygon y Rootstock
    if (!safeLiq1 || typeof safeLiq1 !== 'string' || safeLiq1.length !== 42) {
      throw new CustomError.TechnicalError(
        'createVaultAdmin - ERROR_INVALID_ARGS_POLYGON',
        null,
        'createVaultAdmin - Invalid Polygon owner address',
        null
      );
    }

    if (!safeLiq3 || typeof safeLiq3 !== 'string' || safeLiq3.length !== 42) {
      throw new CustomError.TechnicalError(
        'createVaultAdmin - ERROR_INVALID_ARGS_ROOTSTOCK',
        null,
        'createVaultAdmin - Invalid Rootstock owner address',
        null
      );
    }

    console.log(
      `createVaultAdmin - Requested creation of ProxyAdmin with owners: Polygon (${safeLiq1}), Rootstock (${safeLiq3})`
    );

    const contractName = 'ColateralProxyAdmin';

    // Deploy en Polygon con el owner de Polygon
    const polygonConfig = await getGasPriceAndLimit('POLYGON', 'CREATE');
    const polygonDeployment = await deployProxyAdminInNetwork(
      contractName,
      safeLiq1.toLowerCase(), // Owner de Polygon
      'POLYGON',
      polygonConfig
    );

    // Deploy en Rootstock con el owner de Rootstock
    const rootstockConfig = await getGasPriceAndLimit('ROOTSTOCK', 'CREATE');
    const rootstockDeployment = await deployProxyAdminInNetwork(
      contractName,
      safeLiq3.toLowerCase(), // Owner de Rootstock
      'ROOTSTOCK',
      rootstockConfig
    );

    // Combinar los deployments en una sola respuesta
    const proxyAdminDeploymentResult = {
      polygon: polygonDeployment,
      rootstock: rootstockDeployment,
    };

    return res.status(201).send(proxyAdminDeploymentResult);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

// Helper function to deploy a contract in a specific network
async function deployProxyAdminInNetwork(contractName, owner, network, networkConfig) {
  try {
    console.log(
      `createVaultAdmin - Starting deployment of contract ${contractName} on ${network} for owner ${owner}`
    );

    const { deploymentResponse, contractDeployment } = await deployContract(
      contractName,
      owner,
      network,
      networkConfig
    );

    await deploymentResponse.deployed();
    console.log(`createVaultAdmin - ${network} deployment success`);

    const contractAddress = contractDeployment.address;

    if (!contractAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_CREATE_CONTRACT',
        null,
        `Empty contract address response for ${network}`,
        null
      );
    }

    return {
      proxyAdminAddress: contractAddress.toLowerCase(),
      owner,
      contractDeployment,
    };
  } catch (err) {
    console.error(`createVaultAdmin - Error during ${network} deployment:`, err);
    throw new CustomError.TechnicalError(
      `createVaultAdmin - ERROR_DEPLOY_${network}`,
      err,
      `Error deploying on ${network}`,
      null
    );
  }
}

exports.amountToConversions = async (req, res) => {
  try {
    const { token, targetToken, amount } = req.body; // token = ars

    const valuations = await getCurrenciesValuations();

    const tokenToUSDValuation = valuations.find((item) => {
      return item.currency === token && item.targetCurrency === Types.CurrencyTypes.USD;
    });

    const targetTokenToUSDValuation = valuations.find((item) => {
      return item.currency === targetToken && item.targetCurrency === Types.CurrencyTypes.USD;
    });

    if (!tokenToUSDValuation || !targetTokenToUSDValuation) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_VALUATION',
        null,
        'Missing valuations',
        null
      );
    }

    // 100 = amount, ars = token, targetToken = usdc

    const amountInUSD = amount / tokenToUSDValuation.value;
    // tokenToUSDValuation.value = 700
    // amountInUSD = 0,14
    const amountInTargetToken = amountInUSD * targetTokenToUSDValuation.value;
    return res.status(200).send({ amountInUSD, amountInTargetToken });
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.sendEmailBalance = functions.pubsub
  .schedule('every sunday 08:00')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const ref = db.collection(COLLECTION_NAME);

      console.log('getVaultsToUpdate - Consultando vaults para actualizar');
      const savingsVaultsSnapshot = await ref
        .where('state', '==', Types.StateTypes.STATE_ACTIVE)
        .where('vaultType', 'in', [Types.VaultTypes.VAULT_TYPE_SAVINGS])
        .get();

      if (savingsVaultsSnapshot.empty) {
        console.log('No savings vaults found.');
        return;
      }

      for (const vaultDoc of savingsVaultsSnapshot.docs) {
        const vault = vaultDoc.data();
        const userId = vault.userId;

        // Fetch user details
        const userDoc = await fetchSingleItem({
          collectionName: COLLECTION_NAME_USERS,
          id: userId,
        });
        if (!userDoc) {
          console.log(`No user found for ID: ${userId}`);
          continue;
        }

        const firstName = userDoc.firstName;
        const userEmail = userDoc.email;

        // Extract balance details from vault.balances
        const balances = vault.balances || [];
        let usdValuation = 0;
        let arsValuation = 0;
        let totalTokenValueUSD = 0;

        balances.forEach((balanceData) => {
          if (balanceData.isValuation) {
            if (balanceData.currency === 'usd') {
              usdValuation = balanceData.balance;
            } else if (balanceData.currency === 'ars') {
              arsValuation = balanceData.balance;
            }
          } else {
            const usdValue = balanceData.valuations.find(
              (valuation) => valuation.currency === 'usd'
            ).value;
            totalTokenValueUSD += usdValue;
          }
        });

        // Send email
        const emailContent = `
          Hola ${firstName}, te mandamos el balance semanal de tu bóveda.
          El total de tu bóveda valuado en USD es ${usdValuation}
          El total de tu bóveda valuado en ARS es ${arsValuation}
          El valor total de tus tokens en USD es ${totalTokenValueUSD}
          Gracias por trabajar con nosotros.
        `;

        EmailSender.send({
          to: userEmail,
          SYS_ADMIN_EMAIL,
          message: null,
          template: {
            name: 'mail-balance-semanal',
            data: {
              username: firstName,
              vaultId: vaultDoc.id,
              USDAmount: Math.round(totalTokenValueUSD), // Use Math.floor() or Math.ceil() if preferred
            },
          },
        });

        console.log(
          `Email sent to ${userEmail} for ${firstName} on vault ${vaultDoc.id}, usdValuation es ${totalTokenValueUSD}`
        );
      }
    } catch (error) {
      console.error('Error sending email balance:', error);
    }
  });

exports.getBalanceHistory = async function (req, res) {
  try {
    const { id: vaultId } = req.params;
    const { currency = 'usd', period = 1, backCount = 6 } = req.query;

    // Validate inputs
    if (!vaultId) {
      throw new CustomError.TechnicalError('ERROR_MISSING_ARGS', null, 'Missing vaultId', null);
    }
    if (![0, 1, 2].includes(Number(period))) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_PERIOD',
        null,
        'Invalid period value',
        null
      );
    }
    if (!['usd', 'ars'].includes(currency.toLowerCase())) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_CURRENCY',
        null,
        'Invalid currency',
        null
      );
    }

    // Get target dates based on period
    const targetDates = getTargetDates(Number(period), Number(backCount));

    // Query Firestore for all relevant documents
    const db = admin.firestore();
    const oldestDate = targetDates[targetDates.length - 1];

    const snapshot = await db
      .collection(COLLECTION_VAULTS_BALANCE_HISTORY)
      .where('vaultId', '==', vaultId)
      .where('timestamp', '>=', oldestDate)
      .orderBy('timestamp', 'desc')
      .get();

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    }));

    // Get max values for each target date
    const results = targetDates
      .map((targetDate) => {
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);

        // Find documents for this date range
        const periodDocs = documents.filter(
          (doc) => doc.timestamp >= targetDate && doc.timestamp < nextDate
        );

        if (periodDocs.length === 0) return null;

        // Find max value for this period
        const maxDoc = periodDocs.reduce((max, doc) => {
          const balance =
            doc.balances.find(
              (balanceItem) =>
                balanceItem.isValuation === true &&
                balanceItem.currency.toLowerCase() === currency.toLowerCase()
            )?.balance || 0;

          return !max || balance > max.balance
            ? {
                timestamp: doc.timestamp,
                balance,
                id: doc.id,
                vaultId: doc.vaultId,
              }
            : max;
        }, null);

        return maxDoc;
      })
      .filter(Boolean); // Remove null entries

    return res.status(200).send(results);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.getVaultsBalanceHistory = async function (req, res) {
  try {
    const { vaultIds, currency, period, backCount } = req.query;
    const vaultIdList = vaultIds.split(',').filter((id) => id.trim());

    // Validate inputs
    if (!vaultIds || !vaultIdList.length) {
      throw new CustomError.TechnicalError(
        'ERROR_MISSING_ARGS',
        null,
        'Missing or invalid vaultIds list',
        null
      );
    }

    // Create a mock request object for each vault to reuse getBalanceHistory
    const results = await Promise.all(
      vaultIdList.map(async (vaultId) => {
        const mockReq = {
          params: { id: vaultId.trim() },
          query: { currency, period, backCount },
        };

        const mockRes = {
          status: () => ({
            send: (data) => data,
          }),
        };

        const history = await exports.getBalanceHistory(mockReq, mockRes);

        return {
          vaultId,
          history,
        };
      })
    );

    return res.status(200).send(results);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

function getTargetDates(period, backCount) {
  const dates = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < backCount; i++) {
    let targetDate = new Date(now);

    if (period === 0) {
      // Daily
      targetDate.setDate(now.getDate() - i);
    } else if (period === 1) {
      // Weekly
      if (i === 0) {
        // For the most recent period, use today's date
        targetDate = new Date(now);
      } else {
        // For previous periods, find the Saturday
        targetDate.setDate(now.getDate() - (i - 1) * 7);
        while (targetDate.getDay() !== 6) {
          // 6 is Saturday
          targetDate.setDate(targetDate.getDate() - 1);
        }
      }
    } else {
      // Monthly
      targetDate.setMonth(now.getMonth() - i);
      targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); // Last day of month
    }

    dates.push(targetDate);
  }

  // Sort descending
  return dates.sort((date1, date2) => date2 - date1);
}
