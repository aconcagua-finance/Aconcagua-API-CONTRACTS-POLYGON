const _ = require('lodash');
const { RebasingTokens } = require('../types/RebasingTokens');

exports.areEqualStringLists = function (list1, list2) {
  let areEqual = true;
  list1.forEach((element) => {
    if (
      !list2.find((l2) => {
        return l2 === element;
      })
    ) {
      areEqual = false;
      return false;
    }
  });

  return areEqual;
};

const DOCUMENT_COMPARE_EXCLUDE_KEYS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'];

exports.DOCUMENT_COMPARE_EXCLUDE_KEYS = DOCUMENT_COMPARE_EXCLUDE_KEYS;

const areDeepEqualArrays = function (array1, array2) {
  if (!array1 && !array2) return true;
  if (!array1 && array2) return false;
  if (array1 && !array2) return false;

  return !_.isEqual(array1, array2);
};

exports.areDeepEqualArrays = areDeepEqualArrays;

const areDeepEqual = function (element1, element2, excludeKeys) {
  if (!element1 && !element2) return true;
  if (!element1 && element2) return false;
  if (element1 && !element2) return false;

  if (Array.isArray(element1) && Array.isArray(element2)) {
    return areDeepEqualArrays(element1, element2);
  }

  let element1Keys = Object.keys(element1);
  let element2Keys = Object.keys(element2);

  if (excludeKeys) {
    element1Keys = element1Keys.filter((key) => {
      return !excludeKeys.includes(key);
    });

    element2Keys = element2Keys.filter((key) => {
      return !excludeKeys.includes(key);
    });
  }

  if (!_.isEqual(element1Keys, element2Keys)) return false;

  let areEqual = true;
  element1Keys.forEach((key) => {
    if (!_.isEqual(element1[key], element2[key])) areEqual = false;
  });

  return areEqual;
};

exports.areDeepEqual = areDeepEqual;

const areDeepEqualDocuments = function (document1, document2) {
  return areDeepEqual(document1, document2, DOCUMENT_COMPARE_EXCLUDE_KEYS);
};

exports.areDeepEqualDocuments = areDeepEqualDocuments;

exports.toDateObject = function (dirtyDate) {
  if (!dirtyDate) return null;

  if (dirtyDate instanceof Date) return dirtyDate;

  if (dirtyDate._seconds) return new Date(dirtyDate._seconds * 1000);
  else if (typeof dirtyDate === 'string') return new Date(dirtyDate);
};

exports.enumValuesToArray = (enumType) => {
  return Object.keys(enumType).filter((item) => {
    return isNaN(Number(item));
  });
};

// Helper function to extract rebasing tokens from a vault
const getRebasingTokens = (balances) => {
  return balances
    .filter(
      (balance) => Object.values(RebasingTokens).includes(balance.currency) && !balance.isValuation
    )
    .map((balance) => ({
      currency: balance.currency,
      balance: balance.balance,
    }));
};

exports.getRebasingTokens = getRebasingTokens;

// Helper function to extract non-rebasing tokens from a vault
const getNonRebasingTokens = (balances) => {
  return balances
    .filter(
      (balance) => !Object.values(RebasingTokens).includes(balance.currency) && !balance.isValuation
    )
    .map((balance) => balance.currency);
};

exports.getNonRebasingTokens = getNonRebasingTokens;

// Helper function to extract non-rebasing tokens with balances from a vault
const getNonRebasingTokensWithBalances = (balances) => {
  return balances
    .filter(
      (balance) => !Object.values(RebasingTokens).includes(balance.currency) && !balance.isValuation
    )
    .map((balance) => ({
      currency: balance.currency,
      balance: balance.balance,
    }));
};

exports.getNonRebasingTokensWithBalances = getNonRebasingTokensWithBalances;

// Function to compare rebasing tokens between two vaults with a tolerance percentage
const areRebasingTokensEqualWithDiff = (balances1, balances2, tolerancePercentage = 0) => {
  const rebasingTokens1 = getRebasingTokens(balances1);
  const rebasingTokens2 = getRebasingTokens(balances2);

  if (rebasingTokens1.length !== rebasingTokens2.length) {
    return false;
  }

  return rebasingTokens1.every((token1) => {
    const token2 = rebasingTokens2.find((token) => token.currency === token1.currency);
    if (!token2) {
      return false;
    }
    const difference = Math.abs(token1.balance - token2.balance);
    const allowableDifference = (token1.balance * tolerancePercentage) / 100;
    return difference <= allowableDifference;
  });
};

exports.areRebasingTokensEqualWithDiff = areRebasingTokensEqualWithDiff;

// Function to compare non-rebasing tokens between two vaults
const areNonRebasingTokensEqual = (balances1, balances2) => {
  const nonRebasingTokens1 = getNonRebasingTokensWithBalances(balances1);
  const nonRebasingTokens2 = getNonRebasingTokensWithBalances(balances2);

  if (nonRebasingTokens1.length !== nonRebasingTokens2.length) {
    return false;
  }

  return nonRebasingTokens1.every((token1) => {
    const token2 = nonRebasingTokens2.find((token) => token.currency === token1.currency);
    return token2 && token1.balance === token2.balance;
  });
};

exports.areNonRebasingTokensEqual = areNonRebasingTokensEqual;

// utils.js

// Function to get differences between two objects, including nested objects
const getDifferences = (obj1, obj2) => {
  const diff = {};

  const compare = (key, value1, value2) => {
    if (
      typeof value1 === 'object' &&
      value1 !== null &&
      typeof value2 === 'object' &&
      value2 !== null
    ) {
      const nestedDiff = getDifferences(value1, value2);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (value1 !== value2) {
      diff[key] = { before: value1, after: value2 };
    }
  };

  for (const key in obj1) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      compare(key, obj1[key], obj2[key]);
    } else {
      diff[key] = { before: obj1[key], after: undefined };
    }
  }

  for (const key in obj2) {
    if (!Object.prototype.hasOwnProperty.call(obj1, key)) {
      diff[key] = { before: undefined, after: obj2[key] };
    }
  }

  return diff;
};

exports.getDifferences = getDifferences;

// Función para obtener la suma de ARS para los tokens estables: USDC, USDT, USDM, DOC
function getArsStableValue(balances) {
  const stableTokens = ['usdc', 'usdt', 'usdm', 'doc'];
  let arsStableSum = 0;

  balances.forEach((item) => {
    const currency = item.currency.toLowerCase();
    const arsValuation = item.valuations ?
      item.valuations.find((valuation) => valuation.currency === 'ars') :
      null;

    const arsValue = arsValuation ? arsValuation.value : 0;

    if (stableTokens.includes(currency)) {
      arsStableSum += arsValue;
    }
  });

  return arsStableSum;
}

exports.getArsStableValue = getArsStableValue;

// Función para obtener la suma de ARS para los tokens volátiles: WBTC, WETH
function getArsVolatileValue(balances) {
  const volatileTokens = ['wbtc', 'weth', 'pol', 'rbtc'];
  let arsVolatileSum = 0;

  balances.forEach((item) => {
    const currency = item.currency.toLowerCase();
    const arsValuation = item.valuations ?
      item.valuations.find((valuation) => valuation.currency === 'ars') :
      null;

    const arsValue = arsValuation ? arsValuation.value : 0;

    if (volatileTokens.includes(currency)) {
      arsVolatileSum += arsValue;
    }
  });

  return arsVolatileSum;
}

exports.getArsVolatileValue = getArsVolatileValue;

// Función para obtener la suma de ARS para los tokens estables: USDC, USDT, USDM, DOC
function getUsdStableValue(balances) {
  const stableTokens = ['usdc', 'usdt', 'usdm', 'doc'];
  let usdStableSum = 0;

  balances.forEach((item) => {
    const currency = item.currency.toLowerCase();
    const usdValuation = item.valuations ?
      item.valuations.find((valuation) => valuation.currency === 'usd') :
      null;

    const usdValue = usdValuation ? usdValuation.value : 0;

    if (stableTokens.includes(currency)) {
      usdStableSum += usdValue;
    }
  });

  return usdStableSum;
}

exports.getUsdStableValue = getUsdStableValue;

// Función para obtener la suma de ARS para los tokens volátiles: WBTC, WETH
function getUsdVolatileValue(balances) {
  const volatileTokens = ['wbtc', 'weth', 'pol', 'rbtc'];
  let usdVolatileSum = 0;

  balances.forEach((item) => {
    const currency = item.currency.toLowerCase();
    const usdValuation = item.valuations ?
      item.valuations.find((valuation) => valuation.currency === 'usd') :
      null;

    const usdValue = usdValuation ? usdValuation.value : 0;

    if (volatileTokens.includes(currency)) {
      usdVolatileSum += usdValue;
    }
  });

  return usdVolatileSum;
}

exports.getUsdVolatileValue = getUsdVolatileValue;

export const formatMoneyWithCurrency = function (
  amountArg,
  decimalCount = 2,
  decimal = ',',
  thousands = '.',
  currency = 'ars'
) {
  if (currency == 'ars') {
    const currencySign = 'AR$';
    let amount = amountArg;
    if (!isFinite(amount)) amount = 0;

    decimalCount = Math.abs(decimalCount);
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

    const negativeSign = amount < 0 ? '-' : '';

    const ii = parseInt((amount = Math.abs(Number(amount) || 0).toFixed(decimalCount))).toString();
    const jj = ii.length > 3 ? ii.length % 3 : 0;

    return (
      currencySign +
      ' ' +
      negativeSign +
      (jj ? ii.substring(0, jj) + thousands : '') +
      ii.substring(jj).replace(/(\d{3})(?=\d)/g, `$1${thousands}`) +
      (decimalCount ?
        decimal +
          Math.abs(amount - ii)
            .toFixed(decimalCount)
            .slice(2) :
        '')
    );
  } else if (currency == 'usd') {
    const currencySign = 'U$D';
    let amount = amountArg;
    if (!isFinite(amount)) amount = 0;

    decimalCount = Math.abs(decimalCount);
    decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

    const negativeSign = amount < 0 ? '-' : '';

    const ii = parseInt((amount = Math.abs(Number(amount) || 0).toFixed(decimalCount))).toString();
    const jj = ii.length > 3 ? ii.length % 3 : 0;

    return (
      currencySign +
      ' ' +
      negativeSign +
      (jj ? ii.substring(0, jj) + thousands : '') +
      ii.substring(jj).replace(/(\d{3})(?=\d)/g, `$1${thousands}`) +
      (decimalCount ?
        decimal +
          Math.abs(amount - ii)
            .toFixed(decimalCount)
            .slice(2) :
        '')
    );
  }
  return 0;
};
