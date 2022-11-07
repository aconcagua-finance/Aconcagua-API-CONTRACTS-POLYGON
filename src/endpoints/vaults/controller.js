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
const { CurrencyTypes } = require('../../types/CurrencyTypes');

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
} = require('../baseEndpoint');

const {
  WALLET_PRIVATE_KEY,
  ALCHEMY_API_KEY,
  PROVIDER_NETWORK_NAME,
  USDC_TOKEN_ADDRESS,
  USDT_TOKEN_ADDRESS,
} = require('../../config/appConfig');

const hre = require('hardhat');
// require('hardhat-change-network');

const COLLECTION_NAME = Collections.VAULTS;
const INDEXED_FILTERS = ['userId', 'companyId'];

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
  const { id } = req.params;

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
      if (item.dueDate) item.dueDate = item.dueDate.toDate();
      return item;
    },
  });
};

exports.patch = async function (req, res) {
  const { userId } = res.locals;
  const auditUid = userId;

  const { id } = req.params;

  try {
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

exports.getVaultBalances = async function (req, res) {
  const { id } = req.params;

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
    const smartContract = await fetchSingleItem({ collectionName: COLLECTION_NAME, id });

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

    console.log('BALANCES FOR' + id + ': ' + JSON.stringify(contractBalances));

    const balancesWithCurrencies = [
      // { currency: CurrencyTypes.LOCAL, balance: Utils.formatEther(contractBalances[0]) },
      { currency: CurrencyTypes.USDC, balance: parseFloat(Utils.formatEther(contractBalances[1])) }, // 18 decimales
      {
        currency: CurrencyTypes.USDT,
        balance: parseFloat(Utils.formatUnits(contractBalances[2], 6)), // 6 decimales
      },
    ];

    const valuations = await getCurrenciesValuations();

    const balancesWithValuations = balancesToValuations(balancesWithCurrencies, valuations);

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
    console.log('BALANCES WITH TOKEN FOR ' + id + ': ' + JSON.stringify(allBalances));

    return res.status(200).send(allBalances);
    // const setTx1 = await blockchainContract.setRescueWalletAccount(req.body.rescueWalletAccount);
    // await setTx1.wait();
    // console.log('after: ' + (await blockchainContract.rescueWalletAccount()));
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

const getCurrenciesValuations = async () => {
  return [
    {
      currency: CurrencyTypes.USDT,
      targetCurrency: CurrencyTypes.USD,
      value: 1,
      updatedAt: new Date(Date.now()),
    },
    {
      currency: CurrencyTypes.USDC,
      targetCurrency: CurrencyTypes.USD,
      value: 1,
      updatedAt: new Date(Date.now()),
    },
    {
      currency: CurrencyTypes.USD,
      targetCurrency: CurrencyTypes.ARS,
      value: 300,
      updatedAt: new Date(Date.now()),
    },
  ];
};

const balancesToValuations = (balancesWithToken, valuations) => {
  const newBalances = [];
  const usdToarsValuation = valuations.find((item) => {
    return item.currency === CurrencyTypes.USD && item.targetCurrency === CurrencyTypes.ARS;
  });

  balancesWithToken.forEach((balanceWithToken) => {
    const usdValuation = valuations.find((item) => {
      return (
        item.currency === balanceWithToken.currency && item.targetCurrency === CurrencyTypes.USD
      );
    });

    if (usdValuation) {
      const newBalance = {
        ...balanceWithToken,
        valuations: [
          {
            currency: CurrencyTypes.USD,
            value: usdValuation.value * balanceWithToken.balance,
          },
        ],
      };

      if (usdToarsValuation) {
        newBalance.valuations.push({
          currency: CurrencyTypes.ARS,
          value: usdValuation.value * balanceWithToken.balance * usdToarsValuation.value,
        });
      }
      newBalances.push(newBalance);
    }
  });

  return newBalances;
};

exports.withdraw = async function (req, res) {
  const { id } = req.params;

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
      token === CurrencyTypes.USDT ? Utils.parseUnits(amount, 6) : Utils.parseEther(amount);

    if (token === CurrencyTypes.LOCAL) {
      const wd = await blockchainContract.withdraw(ethAmount);
      await wd.wait();
    }

    if (token === CurrencyTypes.USDC) {
      const wd = await blockchainContract.withdrawUSDC(ethAmount);
      await wd.wait();
    }

    if (token === CurrencyTypes.USDT) {
      const wd = await blockchainContract.withdrawUSDT(ethAmount);
      await wd.wait();
    }

    return res.status(200).send(null);
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};

exports.rescue = async function (req, res) {
  const { id } = req.params;

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
      token === CurrencyTypes.USDT ? Utils.parseUnits(amount, 6) : Utils.parseEther(amount);

    if (token === CurrencyTypes.LOCAL) {
      const wd = await blockchainContract.rescue(ethAmount);
      await wd.wait();
    }

    if (token === CurrencyTypes.USDC) {
      const wd = await blockchainContract.rescueUSDC(ethAmount);
      await wd.wait();
    }

    if (token === CurrencyTypes.USDT) {
      const wd = await blockchainContract.rescueUSDT(ethAmount);
      await wd.wait();
    }

    return res.status(200).send({ ethAmount });
  } catch (err) {
    return ErrorHelper.handleError(req, res, err);
  }
};
