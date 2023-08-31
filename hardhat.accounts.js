const namedAccounts = {
  deployer: {
    137: 'privatekey://' + process.env.DEPLOYER_PRIVATE_KEY,
    '0x5': 'privatekey://' + process.env.DEPLOYER_PRIVATE_KEY,
    default: 0,
  },
  swapper: {
    137: 'privatekey://' + process.env.SWAPPER_PRIVATE_KEY,
    '0x5': 'privatekey://' + process.env.SWAPPER_PRIVATE_KEY,
    default: 1,
  },
  operatorAddress: {
    137: process.env.OPERATOR_ADDRESS,
    '0x5': process.env.OPERATOR_ADDRESS,
    default: 2,
  },
  defaultRescueWallet: {
    137: process.env.DEFAULT_RESCUE_WALLET_ADDRESS,
    '0x5': process.env.DEFAULT_RESCUE_WALLET_ADDRESS,
    default: 3,
  },
  defaultWithdrawWallet: {
    137: process.env.DEFAULT_WITHDRAW_WALLET_ADDRESS,
    '0x5': process.env.DEFAULT_WITHDRAW_WALLET_ADDRESS,
    default: 4,
  },
  swapperAddress: {
    137: process.env.SWAPPER_ADDRESS,
    '0x5': process.env.SWAPPER_ADDRESS,
    default: 5,
  },
};

module.exports = namedAccounts;
