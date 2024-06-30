/* eslint-disable operator-linebreak */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

// require('@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json');
// require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json');
import { Pool, FeeAmount } from '@uniswap/v3-sdk';
import { move } from 'fs-extra';

const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');
const JSBI = require('jsbi');

const admin = require('firebase-admin');
const functions = require('firebase-functions');

const { EthersAdapter, SafeFactory } = require('@safe-global/protocol-kit');

const { creationStruct, updateStruct } = require('../../vs-core-firebase/audit');
const { ErrorHelper } = require('../../vs-core-firebase');
const { LoggerHelper } = require('../../vs-core-firebase');
const { Types } = require('../../vs-core');
const { EmailSender } = require('../../vs-core-firebase');
const { Auth } = require('../../vs-core-firebase');
const {
  areRebasingTokensEqualWithDiff,
  areNonRebasingTokensEqual,
} = require('../../helpers/coreHelper');

const { CustomError } = require('../../vs-core');

const { Collections } = require('../../types/collectionsTypes');
const { ContractTypes } = require('../../types/contractTypes');
const { TokenTypes, ActionTypes } = require('../../types/tokenTypes');
const { VaultTransactionTypes } = require('../../types/vaultTransactionTypes');
const { RebasingTokens } = require('../../types/RebasingTokens');
const { Valuation, Balance } = require('../../types/BalanceTypes');

const axios = require('axios');
const { getParsedEthersError } = require('./errorParser');
const schemas = require('./schemas');

// eslint-disable-next-line camelcase
const { invoke_get_api } = require('../../helpers/httpInvoker');
const { encodePath } = require('../../helpers/uniswapHelper');
const _ = require('lodash');

const {
  abi: QuoterABI,
} = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const {
  abi: SwapRouterABI,
} = require('@uniswap/universal-router/artifacts/contracts/UniversalRouter.sol/UniversalRouter.json');
const {
  abi: ERC20ABI,
} = require('../../../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json');

const {
  CurrencyDecimals,
  tokens,
  getTokenReference,
  tokenOut,
  staticPaths,
  swapOptions,
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
  SYS_ADMIN_EMAIL,
  DEPLOYER_PRIVATE_KEY,
  SWAPPER_PRIVATE_KEY,
  ALCHEMY_API_KEY,
  PROVIDER_NETWORK_NAME,
  HARDHAT_API_URL,
  ETHERSCAN_API_KEY,
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  USDM_TOKEN_ADDRESS,
  WBTC_TOKEN_ADDRESS,
  WETH_TOKEN_ADDRESS,
  SWAP_ROUTER_V3_ADDRESS,
  GAS_STATION_URL,
  QUOTER_CONTRACT_ADDRESS,
  API_PATH_QUOTES,
  SWAPPER_ADDRESS,
  OPERATOR1_ADDRESS,
  OPERATOR2_ADDRESS,
  OPERATOR3_ADDRESS,
  DEFAULT_RESCUE_WALLET_ADDRESS,
  DEFAULT_WITHDRAW_WALLET_ADDRESS,
  ALIQ1_ADDRESS,
  ALIQ2_ADDRESS,
} = require('../../config/appConfig');

const hre = require('hardhat');
const { debug } = require('firebase-functions/logger');
const { TechnicalError } = require('../../vs-core/error');
// require('hardhat-change-network');

const COLLECTION_NAME = Collections.VAULTS;
const COLLECTION_MARKET_CAP = Collections.MARKET_CAP;
const COLLECTION_TOKEN_RATIOS = Collections.TOKEN_RATIOS;
const COLLECTION_NAME_USERS = Collections.USERS;

const INDEXED_FILTERS = ['userId', 'companyId', 'state'];

const COMPANY_ENTITY_PROPERTY_NAME = 'companyId';
const USER_ENTITY_PROPERTY_NAME = 'userId';

// const settings = {
//   apiKey: ALCHEMY_API_KEY,
//   network: Network.ETH_GOERLI,
// };
// const alchemy = new Alchemy(settings);

// const wallet = new Wallet(DEPLOYER_PRIVATE_KEY);

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
        SYS_ADMIN_EMAIL,
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

const deployContract = async (contractName, args = null) => {
  if (!contractName) return null;
  const contract = await hre.ethers.getContractFactory(contractName);
  let deploymentResponse;

  if (Array.isArray(args)) {
    deploymentResponse = await contract.deploy(...args);
  } else {
    deploymentResponse = await contract.deploy(args);
  }

  // Parse
  const contractDeployment = parseContractDeploymentToObject(deploymentResponse);

  return { deploymentResponse, contractDeployment };
};

const getDeployedContract = (vault) => {
  console.log('Dentro de getDeployedContract');
  console.log(
    'Dentro de getDeployedContract - Vault id ',
    vault.id,
    ' Contractname ',
    vault.contractName,
    ' Contract Version ',
    vault.contractVersion
  );
  const smartContract = vault;

  const contractJson = require('../../../artifacts/contracts/' +
    smartContract.contractName +
    '.sol/' +
    smartContract.contractName +
    '.json');
  const abi = contractJson.abi;

  // const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);
  const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
  const userWallet = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, alchemy);

  // Get the deployed contract.
  const blockchainContract = new hre.ethers.Contract(smartContract.id, abi, userWallet); // smartContract.proxyContractAddress

  return blockchainContract;
};

exports.create = async function (req, res) {
  try {
    const { userId } = res.locals;
    const auditUid = userId;
    const { userId: targetUserId, companyId } = req.params;

    if (!targetUserId || !companyId) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_ARGS',
        null,
        'Invalid args creating contract',
        null
      );
    }

    const lender = await fetchSingleItem({ collectionName: Collections.COMPANIES, id: companyId });
    if (!lender || !lender.vaultAdminAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_COMPANY_NOT_FOUND',
        null,
        'Company not found for Vault creation',
        null
      );
    }

    const networkName = hre.network.name;

    const colateralContractName = 'ColateralContract';
    const proxyContractName = 'ColateralProxy';

    // Deploy ColateralContract
    const colateralContractDeploy = await deployContract(colateralContractName);
    const colateralContractAddress = colateralContractDeploy.contractDeployment.address;
    const colateralContractSignerAddress = lender.safeLiq1.toLowerCase(); // colateralContractDeploy.contractDeployment.signerAddress;

    if (!colateralContractAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_CREATE_COLATERAL_CONTRACT',
        null,
        'Empty Colateral contract address response',
        null
      );
    }

    let contractStatus;
    let contractError = '';
    try {
      await colateralContractDeploy.deploymentResponse.deployed();
      console.log('ColateralContract Deployment success');
      contractStatus = 'deployed';
    } catch (err) {
      contractStatus = 'error';
      contractError = err.message;
    }

    // Deploy ColateralProxy
    const contractJson = require('../../../artifacts/contracts/' +
      colateralContractName +
      '.sol/' +
      colateralContractName +
      '.json');
    const colateralAbi = contractJson.abi;

    const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
    const deployerWallet = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, alchemy);
    const colateralBlockchainContract = new hre.ethers.Contract(
      colateralContractAddress,
      colateralAbi,
      deployerWallet
    );

    let args;
    let abiEncodedArgs;
    const operators = [OPERATOR1_ADDRESS, OPERATOR2_ADDRESS, OPERATOR3_ADDRESS];

    if (colateralContractName === 'ColateralContract2') {
      // Contrato version 2

      const tokenNames = ['USDC', 'USDT', 'USDM', 'WBTC', 'WETH'];
      const tokenAddresses = [
        USDC_TOKEN_ADDRESS,
        USDT_TOKEN_ADDRESS,
        USDM_TOKEN_ADDRESS,
        WBTC_TOKEN_ADDRESS,
        WETH_TOKEN_ADDRESS,
      ];

      const contractKeys = ['router', 'swapper', 'quoter'];
      const contractAddresses = [SWAP_ROUTER_V3_ADDRESS, SWAPPER_ADDRESS, QUOTER_CONTRACT_ADDRESS];

      // We use .toLowerCase() because RSK has a different address checksum (capitalizationof letters) that Ethereum
      args = [
        tokenNames,
        tokenAddresses,
        operators,
        DEFAULT_RESCUE_WALLET_ADDRESS,
        DEFAULT_WITHDRAW_WALLET_ADDRESS,
        colateralContractSignerAddress, // lender.safeLiq1,
        lender.safeLiq2.toLowerCase(),
        contractKeys,
        contractAddresses,
      ];

      // Log the ABI encoded constructor arguments
      abiEncodedArgs = hre.ethers.utils.defaultAbiCoder.encode(
        [
          'string[]',
          'address[]',
          'address[]',
          'address',
          'address',
          'address',
          'address',
          'string[]',
          'address[]',
        ],
        args
      );
    } else {
      // Contrato version 1

      args = [
        USDC_TOKEN_ADDRESS,
        USDT_TOKEN_ADDRESS,
        USDM_TOKEN_ADDRESS,
        WBTC_TOKEN_ADDRESS,
        operators,
        DEFAULT_RESCUE_WALLET_ADDRESS,
        DEFAULT_WITHDRAW_WALLET_ADDRESS,
        colateralContractSignerAddress, // lender.safeLiq1,
        lender.safeLiq2.toLowerCase(),
        SWAP_ROUTER_V3_ADDRESS,
        SWAPPER_ADDRESS,
      ];

      abiEncodedArgs = hre.ethers.utils.defaultAbiCoder.encode(
        [
          'address',
          'address',
          'address',
          'address',
          'address[]',
          'address',
          'address',
          'address',
          'address',
          'address',
          'address',
        ],
        args
      );
    }

    const initializeData = await colateralBlockchainContract.populateTransaction.initialize(
      ...args
    );

    console.log('Create - proxy args ');
    console.log(args);

    const proxyContractArgs = [
      colateralContractAddress,
      lender.vaultAdminAddress.toLowerCase(),
      initializeData.data || '0x',
    ];
    const proxyContractDeploy = await deployContract(proxyContractName, proxyContractArgs);
    const proxyContractAddress = proxyContractDeploy.contractDeployment.address;
    const proxyContractSignerAddress = colateralContractDeploy.contractDeployment.signerAddress;

    if (!proxyContractAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_CREATE_PROXY_CONTRACT',
        null,
        'Empty Proxy contract address response',
        null
      );
    }

    // Build entity
    const collectionName = COLLECTION_NAME;
    const validationSchema = schemas.create;

    const body = req.body;
    body.userId = targetUserId;
    body.companyId = companyId;
    body.rescueWalletAccount = DEFAULT_RESCUE_WALLET_ADDRESS;
    body.withdrawWalletAccount = DEFAULT_WITHDRAW_WALLET_ADDRESS;
    body.balances = [];

    body.contractAddress = colateralContractAddress;
    body.contractSignerAddress = colateralContractSignerAddress;
    body.contractDeployment = colateralContractDeploy.contractDeployment;
    body.abiencodedargs = abiEncodedArgs;
    body.contractName = colateralContractName;
    body.contractStatus = contractStatus;
    body.contractNetwork = networkName;
    body.contractVersion = '';
    contractError ? (body.contractError = contractError) : null;

    body.proxyContractAddress = proxyContractAddress;
    body.proxyContractSignerAddress = proxyContractSignerAddress;
    body.proxyContractDeployment = proxyContractDeploy.contractDeployment;
    body.proxyContractName = proxyContractName;
    body.proxyContractStatus = 'pending-deployment-verification';
    body.proxyContractVersion = 'TransparentUpgradeable';

    // Store entity and response
    const itemData = await sanitizeData({ data: body, validationSchema });
    const dbItemData = await createFirestoreDocument({
      collectionName,
      itemData,
      auditUid,
      documentId: proxyContractAddress,
    });

    res.status(201).send(dbItemData);

    // Check Proxy deployment and update status & contract version
    try {
      await proxyContractDeploy.deploymentResponse.deployed();
      console.log('ProxyContract Deployment success');

      const blockchainContract = new hre.ethers.Contract(
        proxyContractAddress,
        colateralAbi,
        deployerWallet
      );

      const contractVersion = await blockchainContract.version();

      await updateSingleItem({
        collectionName,
        data: { proxyContractStatus: 'deployed', contractVersion },
        auditUid,
        id: proxyContractAddress,
      });

      console.log('Updated deployment status of ProxyContract for Vault' + proxyContractAddress);
    } catch (e) {
      console.log(
        'Deployment error while waiting for Proxy contract deploy confirmation for Vault ' +
          proxyContractAddress,
        JSON.stringify(e)
      );

      await updateSingleItem({
        collectionName,
        data: { proxyContractError: e.message },
        auditUid,
        id: proxyContractAddress,
      });

      console.log(
        'Updated deployment status error of ProxyContract for Vault ' + proxyContractAddress
      );
    }
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const getGasPriceAndLimit = async (gasLimit) => {
  // Fallback values
  const gasLimitFallback = 500000;
  const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);

  try {
    const feeData = await alchemy.getFeeData();
    // Not needed const maxFeePerGas = feeData.maxFeePerGas || null;
    // Not needed const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || null;

    const gasPrice = feeData.gasPrice || null;

    console.log('feeData:', feeData);

    const networkConfig = PROVIDER_NETWORK_NAME === 'rsk' ? { gasPrice } : { gasPrice };

    if (gasLimit) {
      networkConfig.gasLimit = gasLimit;
    } else {
      networkConfig.gasLimit = gasLimitFallback;
    }

    console.log('networkConfig:', networkConfig);
    return networkConfig;
  } catch (error) {
    console.error('Error fetching feeData:', error);
    return {
      gasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasLimit: gasLimit || gasLimitFallback,
    };
  }
};

// Se sustituirá por transacción de OPERATOR (adaptada por ahora a DEPLOYER)
const setSmartContractRescueAcount = async function ({ vault, rescueWalletAccount }) {
  const blockchainContract = getDeployedContract(vault);
  const networkConfig = getGasPriceAndLimit();
  const setTx1 = await blockchainContract.setRescueWalletAddress(
    rescueWalletAccount,
    networkConfig
  );
  await setTx1.wait();
  console.log('after: ' + (await blockchainContract.rescueWalletAddress()));
};

const fetchVaultBalances = async (vault) => {
  console.log('fetchVaultBalances- Dentro de fetchVaultBalances ' + vault.id);
  console.log('fetchVaultBalances- Vault version vale ' + vault.contractVersion);

  // Get the deployed contract.
  const blockchainContract = getDeployedContract(vault);
  const contractBalances = await blockchainContract.getBalances();
  console.log('BALANCES FOR ' + vault.id + ': ' + JSON.stringify(contractBalances));
  let balancesWithCurrencies = [];

  const isMultiToken = vault.contractVersion === '2.0.0';

  if (isMultiToken) {
    // Handle new version of the contract
    console.log('fetchVaultBalances- Vault ' + vault.id + ' es multitoken');

    try {
      // Fetch the tokenNames array
      const tokenNames = await blockchainContract.getTokenNames();
      console.log('fetchVaultBalances- tokenNames length: ' + tokenNames.length);
      console.log('fetchVaultBalances- tokenNames: ' + JSON.stringify(tokenNames));

      // Fetch the contract balances (assuming this is needed for the new version as well)
      const contractBalances = await blockchainContract.getBalances();

      // Loop through tokenNames and fetch balances
      for (let i = 0; i < tokenNames.length; i++) {
        const tokenName = tokenNames[i];
        const tokenBalance = contractBalances[i + 1];

        const currencyType = Types.CurrencyTypes[tokenName];
        const formattedBalance = parseFloat(
          Utils.formatUnits(tokenBalance, CurrencyDecimals.get(currencyType))
        );

        console.log(
          'fetchVaultBalances - Balance de ',
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
    balancesWithCurrencies = [
      {
        currency: Types.CurrencyTypes.USDC,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[1], CurrencyDecimals.get(Types.CurrencyTypes.USDC))
        ), // 6 decimales
      },
      {
        currency: Types.CurrencyTypes.USDT,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[2], CurrencyDecimals.get(Types.CurrencyTypes.USDT))
        ), // 6 decimales
      },
      {
        currency: Types.CurrencyTypes.USDM,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[3], CurrencyDecimals.get(Types.CurrencyTypes.USDM))
        ), // 18 decimales
      },
      {
        currency: Types.CurrencyTypes.WBTC,
        balance: parseFloat(
          Utils.formatUnits(contractBalances[4], CurrencyDecimals.get(Types.CurrencyTypes.WBTC))
        ), // 8 decimales
      },
    ];
  }

  console.log(
    'fetchVaultBalances - vault ',
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
  const usdToarsValuation = valuations.find((item) => {
    return (
      item.currency === Types.CurrencyTypes.ARS && item.targetCurrency === Types.CurrencyTypes.USD
    );
  });

  balancesWithToken.forEach((balanceWithToken) => {
    const usdValuation = valuations.find((item) => {
      return (
        item.currency === balanceWithToken.currency &&
        item.targetCurrency === Types.CurrencyTypes.USD
      );
    });

    if (usdValuation) {
      const newBalance = {
        ...balanceWithToken,
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

    // Get the deployed contract.
    const blockchainContract = getDeployedContract(smartContract);
    const decimals = CurrencyDecimals.get(token); // decimales
    const ethAmount = decimals ? Utils.parseUnits(amount, decimals) : Utils.parseEther(amount);
    const networkConfig = await getGasPriceAndLimit();
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

    await EmailSender.send({
      to: employee.email,
      SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-liquidate',
        data: {
          username: employee.firstName + ' ' + employee.lastName,
          vaultId: id,
          lender: lender.name,
          value: withdrawInARS,
          vaultType: smartContract.vaultType,
          creditType: smartContract.creditType,
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
          value: withdrawInARS,
          vaultType: smartContract.vaultType,
          creditType: smartContract.creditType,
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

    const decimals = CurrencyDecimals.get(token); // decimales
    const ethAmount =
      token === decimals ? Utils.parseUnits(amount, decimals) : Utils.parseEther(amount);

    const networkConfig = await getGasPriceAndLimit();
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
      SYS_ADMIN_EMAIL,
      message: null,
      template: {
        name: 'mail-rescue',
        data: {
          username: borrower.firstName + ' ' + borrower.lastName,
          vaultId: id,
          lender: lender.name,
          value: rescueInARS,
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
  const tokens = Object.values(TokenTypes).map((token) => token.toString());

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

    console.log('onVaultUpdate post fetch smart contract data' + docId);

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
      SYS_ADMIN_EMAIL,
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

const createVaultTransaction = async ({ docId, before, after, transactionType }) => {
  let movementType = 'plus';
  let movementAmount = 0;

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
      // movementType = null;
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
      // ARS: calculo cambio del balance y signo.
      const beforeARS = before.balances.find((balance) => {
        return balance.currency === Types.CurrencyTypes.ARS;
      });
      const afterARS = after.balances.find((balance) => {
        return balance.currency === Types.CurrencyTypes.ARS;
      });

      if (
        beforeARS &&
        afterARS &&
        typeof afterARS.balance === 'number' &&
        typeof beforeARS.balance === 'number'
      ) {
        movementAmount = afterARS.balance - beforeARS.balance;

        if (movementAmount < 0) movementAmount = movementAmount * -1; // saco el signo

        if (beforeARS.balance > afterARS.balance) {
          movementType = 'minus';
        }
      }

      // crypto-update: si hay cambio en el balance de algún token.
      const isCryptoUpdate = before.balances.some((bBalance) => {
        if (!bBalance.isValuation) {
          const aBalance = after.balances.find(
            (aBalance) => aBalance.currency === bBalance.currency
          );
          return bBalance.balance !== aBalance.balance;
        }
        return false;
      });

      if (isCryptoUpdate) {
        transactionType = VaultTransactionTypes.CRYPTO_UPDATE;

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

        if (movementAmount < 0) movementAmount = movementAmount * -1;
        if (before.amount > after.amount) {
          movementType = 'minus';
        }
      }
    }

    // Validaciones
    if (transactionType === VaultTransactionTypes.BALANCE_UPDATE) {
      return;
    }
    if (movementAmount === 0 && transactionType !== VaultTransactionTypes.CRYPTO_SWAP) {
      console.log('movementAmount es cero, finaliza sin crear');
      return;
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
    movementType, // plus / minus
    movementAmount,
    transactionType,

    contractDeployment: null, // para que no grabe el bodoque...
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
    // MRM Junio 2024 para evitar CRYPTO_UPDATE duplicados
    if (!after.mustUpdate) return;

    if (!before.balances && !after.balances) return;

    if (before.balances.length !== after.balances.length) {
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

    if (JSON.stringify(before.balances) !== JSON.stringify(after.balances)) {
      console.log('onVaultUpdate_ThenCreateTransaction Son distintos por balance ' + docId);

      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.BALANCE_UPDATE,
      });
      return;
    }

    if (!before.balances && after.balances) {
      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.BALANCE_UPDATE,
      });
      return;
    }

    if (before.amount !== after.amount) {
      await createVaultTransaction({
        docId,
        before,
        after,
        transactionType: VaultTransactionTypes.CREDIT_UPDATE,
      });
    }
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

    // Casos: que se actualiza el crédito, que se hace un withdraw p.ej (saca cripto y cambia crédito), que se retira (saca cripto nomás?)
    try {
      console.log('onVaultUpdate ' + documentPath);
      const balanceUpdateData = await onVaultUpdate_ThenUpdateBalances({ after, docId }); // Actualiza los balances en memoria
      const evaluateUpdateData = await onVaultUpdate_ThenEvaluateBalances({ after, docId });
      await onVaultUpdate_ThenCreateTransaction({ before, after, docId });

      const updateData = { ...balanceUpdateData, ...evaluateUpdateData };

      if (Object.keys(updateData).length > 0) {
        const db = admin.firestore();
        const doc = await db.collection(COLLECTION_NAME).doc(docId).update(updateData);
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
    SYS_ADMIN_EMAIL,
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
          requiredIdx: evalVault.arsLimits.notificationLimit,
          idx: evalVault.vault.amount,
          liquidateIdx: evalVault.arsLimits.actionLimit,
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
          value: evalVault.swap.tokenOutAmount,
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
    const alchemy = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
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
    const networkConfig = await getGasPriceAndLimit(swapsGasEstimation);
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

  // Build swap objects.
  return swapsData
    .map((swapData) => {
      const tokenIn = swapData.tokenIn;
      const tokenOut = swapData.tokenOut;
      const path = encodePath(staticPaths[tokenIn.symbol].tokens, staticPaths[tokenIn.symbol].fees);
      const amountIn = hre.ethers.BigNumber.from(
        Utils.parseUnits(swapData.amountIn.toString(), tokenIn.decimals)
      );

      // Apply slippage.
      const quote = quotes[tokenIn.symbol];

      if (quote <= 0) {
        console.log(
          `Quote for swapping token ${tokenIn.symbol} with amount ${swapData.amountIn} is 0. Swap disregarded.`
        );
        return;
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
    })
    .filter((swapParams) => {
      return swapParams !== undefined;
    });
};

const swapVaultTokenBalances = async (vault) => {
  // Swapea todos los balances de tokens volátiles por TokenOut en config file.

  // Obtengo balances de tokens volátiles
  const tokenTypes = Object.values(TokenTypes).map((token) => token.toString());
  const tokenBalances = vault.balances.filter(
    (bal) => !bal.isValuation && tokenTypes.includes(bal.currency) && bal.balance > 0
  );

  // Preparo swaps para el monto total de cada balance
  const swapsData = tokenBalances.map((bal) => {
    console.log(`Balance de token ${bal.currency} a swapear: ${bal.balance}`);

    return {
      recipient: vault.id, // vault.proxyContractAddress
      tokenIn: tokens[bal.currency],
      tokenOut,
      amountIn: bal.balance,
    };
  });

  const swapsParams = await buildSwapsParams(swapsData);

  if (!swapsParams || swapsParams.length == 0) {
    console.log('No se logro construir ningún swap');
    return { tokenOutAmount: 0 };
  }

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
    const { owner } = req.params;
    if (!owner || typeof owner !== 'string' || owner.length !== 42) {
      throw new CustomError.TechnicalError(
        'createVaultAdmin - ERROR_INVALID_ARGS',
        null,
        'createVaultAdmin - Invalida args creating ProxyAdmin contract',
        null
      );
    }
    console.log(`createVaultAdmin - Pedido creacion ProxyAdmin con owner ${owner}`);

    const contractName = 'ColateralProxyAdmin';
    // We use .toLowerCase() because RSK has a different address checksum (capitalizationof letters) that Ethereum
    const { deploymentResponse, contractDeployment } = await deployContract(
      contractName,
      owner.toLowerCase()
    );

    await deploymentResponse.deployed();
    console.log('Deployment success');

    const contractAddress = contractDeployment.address;

    if (!contractAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_CREATE_CONTRACT',
        null,
        'Empty contract address response',
        null
      );
    }

    const proxyAdmin = {
      proxyAdminAddress: contractAddress.toLowerCase(),
      owner: owner.toLowerCase(),
      contractDeployment,
    };

    console.log(`ProxyAdmin ${contractAddress} creado con exito con owner ${owner}`);
    return res.status(201).send(proxyAdmin);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

// Se desestima. MUMBAI para crear SAFE asociada a un lender
exports.createSafeAccount = async (req, res) => {
  try {
    // Inputs: address (str) lenderLiqAddress, (int) threshold, (int 1 o 2) safeLiqAddressNumber, optional: aconLiqAddress

    // threshold = cantidad de firmantes para aprobar una transaccion
    // safeLiqAddressNumber >> 1 = ALIQ1_ADDRESS / 2 = ALIQ2_ADDRESS
    // aconLiqAddress >> si e envia este parametro, define el segundo rol del safe con esta address
    const body = req.body;

    if (!body.lenderLiqAddress || !body.threshold || !body.safeLiqAddressNumber) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_ARGS',
        null,
        'Invalids args for creating safe account',
        null
      );
    }

    // Init
    // const provider = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME,ALCHEMY_API_KEY);
    const provider = new hre.ethers.providers.JsonRpcProvider(HARDHAT_API_URL);
    const deployerOwnerWallet = new hre.ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    const ethAdapterDeployer = new EthersAdapter({
      ethers: hre.ethers,
      signerOrProvider: deployerOwnerWallet,
    });

    // Init Safe
    const chainId = await ethAdapterDeployer.getChainId();
    // Se utiliza versión 1.3.0 L2 como la UI de Safe. https://github.com/safe-global/safe-deployments/blob/main/src/assets/v1.3.0
    const safeVersion = '1.3.0';
    const contractNetworks = {
      [chainId]: {
        safeMasterCopyAddress: '0x3E5c63644E683549055b9Be8653de26E0B4CD36E',
        safeProxyFactoryAddress: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
        multiSendAddress: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
        multiSendCallOnlyAddress: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',
        fallbackHandlerAddress: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
        signMessageLibAddress: '0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2',
        createCallAddress: '0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4',
        simulateTxAccessorAddress: '0x59AD6735bCd8152B84860Cb256dD9e96b85F69Da',
      },
    };

    const safeFactory = await SafeFactory.create({
      ethAdapter: ethAdapterDeployer,
      safeVersion,
      isL1SafeMasterCopy: false,
      contractNetworks,
    });

    // Create Safe
    let aconLiqAddress; // Optional: aconLiqAddress (ALIQ1_ADDRESS or ALIQ2_ADDRESS if missing, depending on safeLiqAddressNumber)
    if (!body.aconLiqAddress) {
      aconLiqAddress = body.safeLiqAddressNumber === 1 ? ALIQ1_ADDRESS : ALIQ2_ADDRESS;
    } else {
      aconLiqAddress = body.aconLiqAddress;
    }

    const safeAccountConfig = {
      owners: [body.lenderLiqAddress, aconLiqAddress],
      threshold: body.threshold, // 2
      // ... (optional params)
    };

    const safeSdk = await safeFactory.deploySafe({ safeAccountConfig });
    const safeLiqAddress = safeSdk.getAddress();
    return res.status(201).send({ safeLiqAddress });
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

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
  .schedule('every sunday 00:00')
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
            name: 'mail-cripto',
            data: {
              username: firstName,
              vaultId: vaultDoc.id,
              USDAmount: totalTokenValueUSD,
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
