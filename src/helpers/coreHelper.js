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
    .filter((balance) => Object.values(RebasingTokens).includes(balance.currency))
    .map((balance) => ({
      currency: balance.currency,
      balance: balance.balance,
    }));
};

// Helper function to extract non-rebasing tokens from a vault
const getNonRebasingTokens = (balances) => {
  return balances
    .filter((balance) => !Object.values(RebasingTokens).includes(balance.currency))
    .map((balance) => balance.currency);
};

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

// Helper function to extract non-rebasing tokens from a vault
const getNonRebasingTokensWithBalances = (balances) => {
  return balances
    .filter((balance) => !Object.values(RebasingTokens).includes(balance.currency))
    .map((balance) => ({
      currency: balance.currency,
      balance: balance.balance,
    }));
};

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
