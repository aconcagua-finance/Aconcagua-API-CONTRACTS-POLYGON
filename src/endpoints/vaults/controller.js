/* eslint-disable operator-linebreak */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

const { Alchemy, Network, Wallet, Utils } = require('alchemy-sdk');

const admin = require('firebase-admin');
const functions = require('firebase-functions');

const { creationStruct, updateStruct } = require('../../vs-core-firebase/audit');
const { ErrorHelper } = require('../../vs-core-firebase');
const { LoggerHelper } = require('../../vs-core-firebase');
const { Types } = require('../../vs-core');
const { Auth } = require('../../vs-core-firebase');

const { CustomError } = require('../../vs-core');

const { Collections } = require('../../types/collectionsTypes');

const axios = require('axios');
const { getParsedEthersError } = require('./errorParser');
const schemas = require('./schemas');

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
  ALCHEMY_API_KEY,
  PROVIDER_NETWORK_NAME,
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
  GAS_STATION_URL,
} = require('../../config/appConfig');

const hre = require('hardhat');
// require('hardhat-change-network');

const COLLECTION_NAME = Collections.VAULTS;
const COLLECTION_MARKET_CAP = Collections.MARKET_CAP;
const INDEXED_FILTERS = ['userId', 'companyId', 'state'];

const COMPANY_ENTITY_PROPERTY_NAME = 'companyId';
const USER_ENTITY_PROPERTY_NAME = 'userId';

// const settings = {
//   apiKey: ALCHEMY_API_KEY,
//   network: Network.ETH_GOERLI,
// };
// const alchemy = new Alchemy(settings);

// const wallet = new Wallet(WALLET_PRIVATE_KEY);

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
      if (userId && item.userId !== userId) throw new Error('userId missmatch');
      if (companyId && item.companyId !== companyId) throw new Error('companyId missmatch');

      if (item.dueDate) item.dueDate = item.dueDate.toDate();
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
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }

  await patch(req, res, auditUid, COLLECTION_NAME, schemas.update);
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

exports.create = async function (req, res) {
  try {
    const { userId } = res.locals;
    const auditUid = userId;
    const { userId: targetUserId, companyId } = req.params;

    if (!targetUserId || !companyId) {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_ARGS',
        null,
        'Invalida args creating contract',
        null
      );
    }

    console.log('CURRENT NETWORK: ', hre.network.name);

    // const contractName = 'Greeter';
    const contractName = 'ColateralContract_v1_0_0';

    const blockchainContract = await hre.ethers.getContractFactory(contractName);

    const deploymentResponse = await blockchainContract.deploy(
      USDC_TOKEN_ADDRESS,
      USDT_TOKEN_ADDRESS
    );

    console.log('deploymentResponse!:', JSON.stringify(deploymentResponse));

    const contractDeployment = parseContractDeploymentToObject(deploymentResponse);

    const contractAddress = contractDeployment.address;
    const signerAddress = contractDeployment.signerAddress;

    // console.log('LOG RTA CONTRATO', deploymentResponse);
    if (!contractAddress) {
      throw new CustomError.TechnicalError(
        'ERROR_CREATE_CONTRACT',
        null,
        'Empty contract address response',
        null
      );
    }

    console.log('Contract deployment:', contractDeployment);

    const collectionName = COLLECTION_NAME;
    const validationSchema = schemas.create;

    const body = req.body;
    body.userId = targetUserId;
    body.companyId = companyId;
    body.contractAddress = contractAddress;
    body.contractSignerAddress = signerAddress;
    body.contractDeployment = contractDeployment;
    body.contractName = contractName;
    body.contractStatus = 'pending-deployment-verification';
    body.contractNetwork = hre.network.name;
    body.contractVersion = '1.0.0';

    console.log('Create args (' + collectionName + '):', body);

    const itemData = await sanitizeData({ data: body, validationSchema });

    const dbItemData = await createFirestoreDocument({
      collectionName,
      itemData,
      auditUid,
      documentId: contractAddress,
    });

    console.log('Create data: (' + collectionName + ')', dbItemData);

    try {
      await deploymentResponse.deployed();
      console.log('Deployment success');

      await updateSingleItem({
        collectionName,
        data: { contractStatus: 'deployed' },
        auditUid,
        id: contractAddress,
      });

      console.log('Update contract status success' + contractAddress);
    } catch (e) {
      console.log(
        'Deployment error while waiting for depoy confirmation' + contractAddress,
        JSON.stringify(e)
      );

      await updateSingleItem({
        collectionName,
        data: { contractError: e.message },
        auditUid,
        id: contractAddress,
      });

      console.log('Success updating errorto contract' + contractAddress);
    }

    return res.status(201).send(dbItemData);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const setSmartContractRescueAcount = async function ({ vault, rescueWalletAccount }) {
  const contractJson = require('../../../artifacts/contracts/' +
    vault.contractName +
    '.sol/' +
    vault.contractName +
    '.json');
  const abi = contractJson.abi;

  console.log('CURRENT NETWORK: ', PROVIDER_NETWORK_NAME);

  // const alchemy = new hre.ethers.providers.AlchemyProvider('maticmum', process.env.ALCHEMY_API_KEY);
  const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);

  // const userWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, alchemy);
  const userWallet = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, alchemy);

  // // Get the deployed contract.
  const blockchainContract = new hre.ethers.Contract(vault.contractAddress, abi, userWallet);

  // console.log('before: ' + (await blockchainContract.rescueWalletAccount()));

  const setTx1 = await blockchainContract.setRescueWalletAccount(rescueWalletAccount);
  await setTx1.wait();
  console.log('after: ' + (await blockchainContract.rescueWalletAccount()));
};

const fetchVaultBalances = async (vault) => {
  const smartContract = vault;

  const contractJson = require('../../../artifacts/contracts/' +
    smartContract.contractName +
    '.sol/' +
    smartContract.contractName +
    '.json');
  const abi = contractJson.abi;

  console.log('CURRENT NETWORK: ', PROVIDER_NETWORK_NAME);

  // const alchemy = new hre.ethers.providers.AlchemyProvider('maticmum', process.env.ALCHEMY_API_KEY);
  const alchemy = new hre.ethers.providers.AlchemyProvider(PROVIDER_NETWORK_NAME, ALCHEMY_API_KEY);

  console.log('alchemmy config done');

  // const userWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, alchemy);
  const userWallet = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, alchemy);

  console.log('wallet config done');

  // // Get the deployed contract.
  const blockchainContract = new hre.ethers.Contract(
    // '0x14bd5806E43A541A871C3CB0E0Fc6142786BB406',
    smartContract.contractAddress,
    abi,
    userWallet
  );

  console.log('Get the deployed contract done');

  const contractBalances = await blockchainContract.getBalances();

  console.log('BALANCES FOR' + vault.id + ': ' + JSON.stringify(contractBalances));

  const balancesWithCurrencies = [
    // { currency: CurrencyTypes.LOCAL, balance: Utils.formatEther(contractBalances[0]) },
    {
      currency: Types.CurrencyTypes.USDC,
      balance: parseFloat(Utils.formatEther(contractBalances[1])),
    }, // 18 decimales
    {
      currency: Types.CurrencyTypes.USDT,
      balance: parseFloat(Utils.formatUnits(contractBalances[2], 6)), // 6 decimales
    },
  ];

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

      if (sumarizedBalance) sumarizedBalance.balance += valuation.value;
      else {
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
    // TODO MICHEL

    // return res.status(200).send([
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
    // ]);
    console.log('ENTRO A getVaultBalances' + id);
    const vault = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });

    const allBalances = await fetchVaultBalances(vault);

    // actualizo
    await updateSingleItem({
      collectionName: COLLECTION_NAME,
      data: { balances: allBalances, mustUpdate: false, balancesUpdateRetries: 0 },
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

  // USDT 0
  // USDC 0.1

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

const getGasPrice = async () => {
  // const gasEstimated = await blockchainContract.estimateGas.withdrawUSDC(ethAmount);
  // get max fees from gas station
  let maxFeePerGas = hre.ethers.BigNumber.from(40000000000); // fallback to 40 gwei
  let maxPriorityFeePerGas = hre.ethers.BigNumber.from(40000000000); // fallback to 40 gwei
  try {
    const { data } = await axios({
      method: 'get',
      url: GAS_STATION_URL,
      // url: isProd
      //   ? 'https://gasstation-mainnet.matic.network/v2'
      //   : 'https://gasstation-mumbai.matic.today/v2',
    });
    maxFeePerGas = hre.ethers.utils.parseUnits(Math.ceil(data.fast.maxFee) + '', 'gwei');
    maxPriorityFeePerGas = hre.ethers.utils.parseUnits(
      Math.ceil(data.fast.maxPriorityFee) + '',
      'gwei'
    );
  } catch (e) {
    console.error('ERROR FETCHING PRICE FOR GAS CALC', e);
    // ignore
  }

  return { maxFeePerGas, maxPriorityFeePerGas };
};

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

    const contractJson = require('../../../artifacts/contracts/' +
      smartContract.contractName +
      '.sol/' +
      smartContract.contractName +
      '.json');
    const abi = contractJson.abi;

    console.log('CURRENT NETWORK: ', PROVIDER_NETWORK_NAME);

    // const alchemy = new hre.ethers.providers.AlchemyProvider('maticmum', process.env.ALCHEMY_API_KEY);
    const alchemy = new hre.ethers.providers.AlchemyProvider(
      PROVIDER_NETWORK_NAME,
      ALCHEMY_API_KEY
    );

    // const userWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, alchemy);
    const userWallet = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, alchemy);

    // // Get the deployed contract.
    const blockchainContract = new hre.ethers.Contract(
      smartContract.contractAddress,
      abi,
      userWallet
    );

    const ethAmount =
      token === Types.CurrencyTypes.USDT ? Utils.parseUnits(amount, 6) : Utils.parseEther(amount);

    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrice();

    // if (token === CurrencyTypes.LOCAL) {
    //   // const wd = await blockchainContract.withdraw(ethAmount, {
    //   //   maxFeePerGas,
    //   //   maxPriorityFeePerGas,
    //   // });
    //   // await wd.wait();
    // }

    if (token === Types.CurrencyTypes.USDC) {
      const wd = await blockchainContract.withdrawUSDC(ethAmount, {
        // gasLimit: Math.ceil(gasEstimated * 100),
        // gasPrice: 2000000000,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await wd.wait();
    } else if (token === Types.CurrencyTypes.USDT) {
      const wd = await blockchainContract.withdrawUSDT(ethAmount, {
        // gasLimit: Math.ceil(gasEstimated * 100),
        // gasPrice: 2000000000,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      await wd.wait();
    } else {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_TOKEN',
        null,
        'Invalid token: ' + token,
        null
      );
    }

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

    return res.status(200).send(null);
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
        'El monto es superior al monto del crédito (' +
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
        'El monto es superior al monto del crédito (' +
          rescueInARS +
          ' > ' +
          deposits +
          ' - ' +
          smartContract.amount +
          ')',
        null
      );
    }

    const contractJson = require('../../../artifacts/contracts/' +
      smartContract.contractName +
      '.sol/' +
      smartContract.contractName +
      '.json');
    const abi = contractJson.abi;

    console.log('CURRENT NETWORK: ', PROVIDER_NETWORK_NAME);

    // const alchemy = new hre.ethers.providers.AlchemyProvider('maticmum', process.env.ALCHEMY_API_KEY);
    const alchemy = new hre.ethers.providers.AlchemyProvider(
      PROVIDER_NETWORK_NAME,
      ALCHEMY_API_KEY
    );

    // const userWallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, alchemy);
    const userWallet = new hre.ethers.Wallet(WALLET_PRIVATE_KEY, alchemy);

    // // Get the deployed contract.
    const blockchainContract = new hre.ethers.Contract(
      smartContract.contractAddress,
      abi,
      userWallet
    );

    const ethAmount =
      token === Types.CurrencyTypes.USDT ? Utils.parseUnits(amount, 6) : Utils.parseEther(amount);

    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrice();

    // if (token === CurrencyTypes.LOCAL) {
    //   const wd = await blockchainContract.rescue(ethAmount, {
    //     // gasLimit: Math.ceil(gasEstimated * 100),
    //     // gasPrice: 2000000000,
    //     maxFeePerGas,
    //     maxPriorityFeePerGas,
    //   });
    //   await wd.wait();
    // }

    if (token === Types.CurrencyTypes.USDC) {
      const wd = await blockchainContract.rescueUSDC(ethAmount, {
        // gasLimit: Math.ceil(gasEstimated * 100),
        // gasPrice: 2000000000,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await wd.wait();
    } else if (token === Types.CurrencyTypes.USDT) {
      const wd = await blockchainContract.rescueUSDT(ethAmount, {
        // gasLimit: Math.ceil(gasEstimated * 100),
        // gasPrice: 2000000000,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      await wd.wait();
    } else {
      throw new CustomError.TechnicalError(
        'ERROR_INVALID_TOKEN',
        null,
        'Invalid token: ' + token,
        null
      );
    }

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

  console.log('Consultando vaults para actualizar');
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

  return vaults;
};

const MAX_BALANCES_RETRIES = 5;
const markVaultsToUpdate = async function () {
  const db = admin.firestore();

  // TODO MICHEL HACER LOTES
  const batch = db.batch();

  const vaults = await getVaultsToUpdate();

  // const boundaryStartDate = new Date(Date.now());
  // boundaryStartDate.setDate(boundaryStartDate.getDate() - 45);

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
    if (!after.mustUpdate) return;

    const allBalances = await fetchVaultBalances({ ...after, id: docId });

    console.log('onVaultUpdate post fetch smart contract data' + docId);

    const updateData = {
      lastBalanceUpdate: admin.firestore.FieldValue.serverTimestamp(), // new Date(Date.now())
      mustUpdate: false,
      balancesUpdateRetries: 0,
      balances: allBalances,
    };

    const db = admin.firestore();
    const doc = await db.collection(COLLECTION_NAME).doc(docId).update(updateData);
  } catch (e) {
    console.error('Error actualizando los balances del contrato ' + docId + '. ' + e.message);
    throw e;
  }
};

const createVaultBalanceChangeTransaction = async ({ docId, before, after, transactionType }) => {
  let movementType = 'plus';
  let movementAmount = 0;

  if (before && after && before.balances && after.balances) {
    console.log(
      'transactionType:',
      transactionType,
      'before:',
      JSON.stringify(before.balances),
      'after:',
      JSON.stringify(after.balances)
    );

    const arsCurrency = Types.CurrencyTypes.ARS;
    const usdCurrency = Types.CurrencyTypes.USD;

    const beforeUSD = before.balances.find((balance) => {
      return balance.currency === usdCurrency;
    });

    const afterUSD = after.balances.find((balance) => {
      return balance.currency === usdCurrency;
    });

    // quien invoca a esta fn entiende de un cambio de balance por la comparacion de los strings del obj balances, entonces invoca con 'balances-update'
    // aca evaluamos el importe en USD, dado que por ahora solo se usan monedas en valor igual al USD, si vario el balance en USD quiere decir que hubo un movimiento de un token (crypto)
    // en ese caso cambio el transaction type
    if (
      transactionType === 'balances-update' &&
      beforeUSD &&
      afterUSD &&
      typeof afterUSD.balance === 'number' &&
      typeof beforeUSD.balance === 'number'
    ) {
      let usdMovementAmount = afterUSD.balance - beforeUSD.balance;

      console.log('usdMovementAmount: ', usdMovementAmount);

      if (usdMovementAmount < 0) usdMovementAmount = usdMovementAmount * -1; // saco el signo

      if (usdMovementAmount > 0) {
        transactionType = 'crypto-update';
      }
    }

    const beforeARS = before.balances.find((balance) => {
      return balance.currency === arsCurrency;
    });

    const afterARS = after.balances.find((balance) => {
      return balance.currency === arsCurrency;
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
  }

  if (movementAmount === 0 && transactionType !== 'vault-create') {
    console.log('movementAmount es cero, finaliza sin crear');
    return;
  }

  const createData = {
    ...after,
    vaultId: docId,
    movementType, // plus / minus
    movementAmount,
    transactionType,

    contractDeployment: null, // para que no grabe el bodoque...

    state: Types.StateTypes.STATE_ACTIVE,
    ...creationStruct('admin'),
  };

  delete createData.id;
  delete createData.contractDeployment;

  console.log('Creando transaccion: (' + transactionType + ')' + JSON.stringify(createData));

  const db = admin.firestore();
  const doc = await db.collection(Collections.VAULT_TRANSACTIONS).doc().set(createData);
};

// eslint-disable-next-line camelcase
const onVaultUpdate_ThenCreateTransaction = async ({ before, after, docId, documentPath }) => {
  try {
    if (!before.balances && !after.balances) return;

    if (!before.balances && after.balances) {
      await createVaultBalanceChangeTransaction({
        docId,
        before,
        after,
        transactionType: 'balances-update',
      });
      return;
    }

    if (before.balances.length !== after.balances.length) {
      console.log('Son distintos por cantidad ' + docId);
      await createVaultBalanceChangeTransaction({
        docId,
        before,
        after,
        transactionType: 'balances-update',
      });
      return;
    }

    if (JSON.stringify(before.balances) !== JSON.stringify(after.balances)) {
      console.log('Son distintos por comparacion ' + docId);

      await createVaultBalanceChangeTransaction({
        docId,
        before,
        after,
        transactionType: 'balances-update',
      });
      return;
    }
  } catch (e) {
    console.error('Error creando la transaccion ' + docId + '. ' + e.message);
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
      console.log('onVaultUpdate ' + documentPath);
      // se ejecuta el onVaultUpdate_ThenUpdateBalances dado que el cron que corre y marca las vaults para actualizar no actualiza los saldos, solo deja marcas
      await onVaultUpdate_ThenUpdateBalances({ after, docId });
      await onVaultUpdate_ThenCreateTransaction({ before, after, docId });
      console.log('onVaultUpdate success ' + documentPath);
    } catch (err) {
      console.error('error onUpdate document', documentPath, err);

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

      await createVaultBalanceChangeTransaction({
        docId,
        before,
        after,
        transactionType: 'vault-create',
      });

      console.log('onVaultCreate success ' + documentPath);
    } catch (err) {
      console.error('error onCreate document', documentPath, err);

      return null;
    }
  });
