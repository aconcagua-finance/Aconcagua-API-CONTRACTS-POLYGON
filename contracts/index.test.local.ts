const { ethers, upgrades } = require('hardhat');
const colateralJson = require('../artifacts/contracts/ColateralContract2.sol/ColateralContract2.json');

const WETH = 'WETH';
const WBTC = 'WBTC';
const USDC = 'USDC';
const USDT = 'USDT';
const TOK4 = 'TOK4';
const ROUTER = 'router';
const SWAPPER = 'swapper';
const ACONCAGUA_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ACONCAGUA'));
const LENDER_LIQ_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('LENDER_LIQ'));
const RESCUER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('RESCUER'));
const V3_SWAP_EXACT_IN_COMMAND = '0x00';
const tokenNames = [WETH, WBTC, USDC, USDT, TOK4];
const contractKeys = [ROUTER, SWAPPER];
const TOKEN_OUT_MULTIPLIER = 10 ** 6;
const WETH_MULTIPLIER = 10 ** 18;

describe('ColateralContract2 tests (Via Proxy)', function () {
  let weth;
  let wbtc;
  let usdc;
  let usdt;
  let token4;
  let tokenAddresses;
  let aconcagua;
  let aconcagua0;
  let aconcagua1;
  let aconcagua2;
  let rescueWallet;
  let withdrawWallet;
  let firstLenderLiq;
  let secondLenderLiq;
  let contractAddresses;
  let router;
  let validator;
  let priceConsumer;
  let swapper;
  let colateral2;
  let colateralProxy;
  let proxyWithAbi;
  let deployer;
  let proxyTxSigner;
  let tokenIn;
  let tokenOut;
  let pathBytes;
  let params;
  let defaultSwapParams;
  let colateral2Iface;
  let ColateralContract2;
  let ColateralProxy;

  beforeAll(async function () {
    // Deploy Mocks

    const RouterMock = await ethers.getContractFactory('UniversalRouterMock');

    router = await RouterMock.deploy();
    await router.deployed();

    const TokenMock = await ethers.getContractFactory('TokenMock');

    weth = await TokenMock.deploy();
    await weth.deployed();

    wbtc = await TokenMock.deploy();
    await wbtc.deployed();

    usdc = await TokenMock.deploy();
    await usdc.deployed();

    usdt = await TokenMock.deploy();
    await usdt.deployed();
  });

  beforeEach(async function () {
    [
      deployer,
      proxyTxSigner,
      token4,
      aconcagua0,
      aconcagua1,
      aconcagua2,
      rescueWallet,
      withdrawWallet,
      firstLenderLiq,
      secondLenderLiq,
      swapper,
    ] = await ethers.getSigners();

    tokenAddresses = [weth.address, wbtc.address, usdc.address, usdt.address, token4.address];

    aconcagua = [aconcagua0.address, aconcagua1.address, aconcagua2.address];

    contractAddresses = [router.address, swapper.address];

    // Deploy the contracts before each test

    const PriceConsumer = await ethers.getContractFactory('PriceConsumerV3Mock');

    priceConsumer = await PriceConsumer.deploy();
    await priceConsumer.deployed();

    const Validator = await ethers.getContractFactory('ValidatorContract');

    validator = await Validator.deploy(priceConsumer.address);
    await validator.deployed();

    ColateralContract2 = await ethers.getContractFactory('ColateralContract2');

    colateral2 = await ColateralContract2.deploy();
    await colateral2.deployed();

    ColateralProxy = await ethers.getContractFactory('ColateralProxy');

    colateral2Iface = new ethers.utils.Interface(colateralJson.abi);

    const initData = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    colateralProxy = await ColateralProxy.deploy(colateral2.address, deployer.address, initData);

    proxyWithAbi = new ethers.Contract(colateralProxy.address, colateralJson.abi, proxyTxSigner);

    // Default swap params
    tokenIn = weth.address;
    tokenOut = usdc.address;

    pathBytes = ethers.utils.solidityPack(['address', 'address'], [tokenIn, tokenOut]);

    params = {
      path: pathBytes,
      recipient: colateralProxy.address,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 3),
      amountIn: BigInt(1 * WETH_MULTIPLIER),
      amountOutMinimum: BigInt(2000 * TOKEN_OUT_MULTIPLIER),
    };

    defaultSwapParams = {
      params,
      tokenIn,
      tokenOut,
    };
  });

  // ************ TESTS *************
  // Init
  it('Initialize happy path check', async function () {
    expect(await proxyWithAbi.tokenNames(0)).toEqual(WETH);
    expect(await proxyWithAbi.tokenNames(1)).toEqual(WBTC);
    expect(await proxyWithAbi.tokenNames(2)).toEqual(USDC);
    expect(await proxyWithAbi.tokenNames(3)).toEqual(USDT);
    expect(await proxyWithAbi.tokenNames(4)).toEqual(TOK4);

    expect(await proxyWithAbi.tokenTable(WETH)).toEqual(weth.address);
    expect(await proxyWithAbi.tokenTable(WBTC)).toEqual(wbtc.address);
    expect(await proxyWithAbi.tokenTable(USDC)).toEqual(usdc.address);
    expect(await proxyWithAbi.tokenTable(USDT)).toEqual(usdt.address);
    expect(await proxyWithAbi.tokenTable(TOK4)).toEqual(token4.address);

    expect(await proxyWithAbi.rescueWalletAddress()).toEqual(rescueWallet.address);
    expect(await proxyWithAbi.withdrawWalletAddress()).toEqual(withdrawWallet.address);

    expect(await proxyWithAbi.contractKeys(0)).toEqual(ROUTER);
    expect(await proxyWithAbi.contractKeys(1)).toEqual(SWAPPER);

    expect(await proxyWithAbi.contractAddresses(ROUTER)).toEqual(router.address);
    expect(await proxyWithAbi.contractAddresses(SWAPPER)).toEqual(swapper.address);

    expect(await proxyWithAbi.version()).toEqual('2.0.0');
  });
  it('All three aconcagua admins cannot be set to address zero', async () => {
    const badAconcagua = [
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
    ];

    const initDataBadAconc = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      badAconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initDataBadAconc);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AdminAddressInvalid.*/));
    }
  });
  it('No Admin privileges should be given to address zero (At least one aconcagua != address(0)) - TRIGGERS ISSUE MI-02', async () => {
    const oneAconcagua = [
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      aconcagua2.address,
    ];

    const initDataOneAconc = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      oneAconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      const colProxyOneAconc = await ColateralProxy.deploy(
        colateral2.address,
        deployer.address,
        initDataOneAconc
      );
      expect(true).toEqual(false); // Sanity check - should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AdminAddressInvalid.*/));
    }
  });
  it('RescueWalletAddress cannot be zero', async () => {
    const initBadRescueWallet = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      ethers.constants.AddressZero,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadRescueWallet);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*RescueAddressInvalid.*/));
    }
  });
  it('WithdrawWalletAddress cannot be zero', async () => {
    const initBadWithdrawWallet = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      ethers.constants.AddressZero,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadWithdrawWallet);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*WithdrawAddressInvalid.*/));
    }
  });
  it('FirstLender cannot be zero', async () => {
    const initBadFirstLender = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      ethers.constants.AddressZero,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadFirstLender);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*FirstLenderLiqAddressInvalid.*/));
    }
  });
  it('SecondLender cannot be zero', async () => {
    const initBadSecondLender = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadSecondLender);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*SecondLenderLiqAddressInvalid.*/));
    }
  });
  it('Tokens addresses cannot be zero - TRIGGERS ISSUE MI-01', async () => {
    const badTokenAddresses = [
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
    ];

    const initBadAddresses = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      badTokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadAddresses);
      expect(false).toEqual(true); // Sanity Check, should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*TokenAddressInvalid.*/));
    }
  });
  it('Contracts addresses cannot be zero - TRIGGERS ISSUE MI-01', async () => {
    const badContractAddresses = [ethers.constants.AddressZero, ethers.constants.AddressZero];

    const initBadAddresses = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      badContractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadAddresses);
      expect(false).toEqual(true); // Sanity Check, should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*ContractAddressInvalid.*/));
    }
  });
  it('Token names cannot be different from what is expected - TRIGGERS ISSUE MI-01', async () => {
    const badTokenNames = ['This', 'is', 'bad', 'very', 'wrong'];

    const initBadAddresses = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      badTokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      contractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadAddresses);
      expect(false).toEqual(true); // Sanity Check, should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*MissingRequiredToken.*/));
    }
  });
  it('Contract keys cannot be different from what is expected - TRIGGERS ISSUE MI-01', async () => {
    const badContractKeys = ['Not', 'Right'];

    const initBadAddresses = colateral2Iface.encodeFunctionData('initialize', [
      validator.address,
      tokenNames,
      tokenAddresses,
      aconcagua,
      rescueWallet.address,
      withdrawWallet.address,
      firstLenderLiq.address,
      secondLenderLiq.address,
      badContractKeys,
      contractAddresses,
    ]);

    try {
      await ColateralProxy.deploy(colateral2.address, deployer.address, initBadAddresses);
      expect(false).toEqual(true); // Sanity Check, should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*MissingRequiredContractKey.*/));
    }
  });

  // setWithdrawWallet
  it('WithdrawWallet cannot be set to address 0', async () => {
    try {
      await proxyWithAbi.connect(aconcagua1).setWithdrawWalletAddress(ethers.constants.AddressZero);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*WithdrawAddressInvalid.*/));
    }
  });
  it('Only Aconcagua Role can set the Withdraw Wallet address', async () => {
    try {
      await proxyWithAbi.connect(withdrawWallet).setWithdrawWalletAddress(aconcagua0.address);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }

    expect(await proxyWithAbi.withdrawWalletAddress()).toEqual(withdrawWallet.address);

    await proxyWithAbi.connect(aconcagua0).setWithdrawWalletAddress(aconcagua0.address);

    expect(await proxyWithAbi.withdrawWalletAddress()).not.toEqual(withdrawWallet.address);
    expect(await proxyWithAbi.withdrawWalletAddress()).toEqual(aconcagua0.address);
  });

  // setRescueWallet
  it('RescueWallet cannot be set to address 0', async () => {
    try {
      await proxyWithAbi.connect(aconcagua1).setRescueWalletAddress(ethers.constants.AddressZero);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*RescueAddressInvalid.*/));
    }
  });
  it('Only Aconcagua Role can set the Rescue Wallet address', async () => {
    try {
      await proxyWithAbi.connect(rescueWallet).setRescueWalletAddress(aconcagua0.address);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }

    expect(await proxyWithAbi.rescueWalletAddress()).toEqual(rescueWallet.address);

    await proxyWithAbi.connect(aconcagua0).setRescueWalletAddress(aconcagua0.address);

    expect(await proxyWithAbi.rescueWalletAddress()).not.toEqual(rescueWallet.address);
    expect(await proxyWithAbi.rescueWalletAddress()).toEqual(aconcagua0.address);
  });

  // swapExactInputs
  it('Can swap with Swapper Role', async () => {
    // Mint WETH tokens para el swapper basado en la cantidad de tokenIn (amountIn)
    const initialBalance = ethers.BigNumber.from(defaultSwapParams.params.amountIn);
    await weth.mint(proxyWithAbi.address, defaultSwapParams.params.amountIn);
    await proxyWithAbi.connect(swapper).swapExactInputs([defaultSwapParams]);
    const tokenInTransfer = await weth.transferCalls(0);
    const routerCall = await router.executeCalls(0);
    const routerCallInputs = await router.getExecuteCallInputs(0);

    const expectedRouterCallInputs = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'uint256', 'bytes', 'bool'],
      [
        defaultSwapParams.params.recipient,
        defaultSwapParams.params.amountIn,
        defaultSwapParams.params.amountOutMinimum,
        ethers.utils.hexlify(defaultSwapParams.params.path),
        false,
      ]
    );

    expect([tokenInTransfer[0], tokenInTransfer[1], tokenInTransfer[2].toString()]).toEqual([
      router.address,
      colateralProxy.address,
      BigInt(1 * WETH_MULTIPLIER).toString(),
    ]);
    expect([routerCall[0], routerCall[1].toString()]).toEqual([
      V3_SWAP_EXACT_IN_COMMAND,
      defaultSwapParams.params.deadline.toString(),
    ]);
    expect(routerCallInputs).toEqual(expectedRouterCallInputs);
  });
  it('Cannot call swapExactInputs if not Swapper Role', async () => {
    try {
      await proxyWithAbi.swapExactInputs([defaultSwapParams]);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }
  });
  it('Can swap with a path != than tokenIn - tokenOut - TRIGGERS ISSUE HI-01', async () => {
    const badTokenIn = weth.address;
    const badTokenOut = usdt.address;

    const badPathBytes = ethers.utils.solidityPack(
      ['address', 'address'],
      [badTokenIn, badTokenOut]
    );

    const badParams = {
      ...params,
      path: badPathBytes,
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    // Mint 10 unit of `badTokenIn` (wbtc) to the swapper address
    await weth.mint(proxyWithAbi.address, ethers.utils.parseUnits('10', 18));

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check (Should fail)
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*InvalidPath.*/));
    }
  });
  it('Cannot swap if recipient != proxy address', async () => {
    const badParams = {
      ...params,
      recipient: colateral2.address,
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*RecipientError.*/));
    }
  });
  it('Cannot swap if tokenOut is other than USDC or USDT', async () => {
    const badSwapParams = {
      ...defaultSwapParams,
      tokenOut: token4.address,
    };

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*TokenOutError.*/));
    }
  });
  it('Cannot swap if tokenIn is other than WETH or WBTC', async () => {
    const badSwapParams = {
      ...defaultSwapParams,
      tokenIn: token4.address,
    };

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*TokenInError.*/));
    }
  });
  it('Cannot swap if amountOutMin is 0', async () => {
    const badParams = {
      ...params,
      amountOutMinimum: 0,
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    // Mint 10 unit of WETH
    await weth.mint(proxyWithAbi.address, ethers.utils.parseUnits('10', 18));

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AmountOutMinimumTooLow.*/));
    }
  });
  it('Cannot swap if amountOutMin is slippage is greater than 2%', async () => {
    const badParams = {
      ...params,
      amountOutMinimum: BigInt(0.5 * TOKEN_OUT_MULTIPLIER),
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    // Mint 10 unit of WETH
    await weth.mint(proxyWithAbi.address, ethers.utils.parseUnits('10', 18));

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AmountOutMinimumTooLow.*/));
    }
  });
  it('Cannot swap if amountIn is 0', async () => {
    const badParams = {
      ...params,
      amountIn: 0,
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AmountInError.*/));
    }
  });
  // eslint-disable-next-line quotes
  it("Cannot swap if amountIn is greater than contract's token balance", async () => {
    const badParams = {
      ...params,
      amountIn: BigInt(5000 * WETH_MULTIPLIER),
    };

    const badSwapParams = {
      ...defaultSwapParams,
      params: badParams,
    };

    try {
      await proxyWithAbi.connect(swapper).swapExactInputs([badSwapParams]);
      expect(true).toEqual(false); // Sanity check - Should fail
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*AmountInError.*/));
    }
  });

  // Withdraw
  it('Cannot call withdraw if not LENDER_LIQ_ROLE', async () => {
    try {
      await proxyWithAbi.withdraw(1, USDC);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }
  });
  it('Cannot withdraw with a bad tokenSymbol', async () => {
    try {
      await proxyWithAbi.connect(firstLenderLiq).withdraw(1, 'bad');
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*call to non-contract.*/));
    }
  });
  it('LENDER_LIQ_ROLE can withdraw', async () => {
    // Mint 1000 unit of USDC
    await usdc.mint(proxyWithAbi.address, ethers.utils.parseUnits('1000', 6));
    await proxyWithAbi.connect(firstLenderLiq).withdraw(1, USDC);
  });

  // Rescue
  it('Other than RESCUER_ROLE cannot rescue', async () => {
    try {
      await proxyWithAbi.rescue(1, USDC);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }
  });
  it('RESCUER_ROLE can rescue', async () => {
    // Mint 1000 unit of USDC
    await usdc.mint(proxyWithAbi.address, ethers.utils.parseUnits('1000', 6));
    await proxyWithAbi.connect(firstLenderLiq).rescue(1, USDC);
  });

  // Other
  it('Other than Role admin cannot revoke a role', async () => {
    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua1.address)).toEqual(true);

    try {
      await proxyWithAbi.revokeRole(ACONCAGUA_ROLE, aconcagua1.address);
    } catch (e) {
      expect(e.message).toEqual(expect.stringMatching(/.*missing role.*/));
    }

    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua1.address)).toEqual(true);
  });
  it('One Rescue / Lender role can void the other', async () => {
    expect(await proxyWithAbi.hasRole(LENDER_LIQ_ROLE, firstLenderLiq.address)).toEqual(true);
    expect(await proxyWithAbi.hasRole(RESCUER_ROLE, firstLenderLiq.address)).toEqual(true);

    await proxyWithAbi.connect(secondLenderLiq).revokeRole(LENDER_LIQ_ROLE, firstLenderLiq.address);
    await proxyWithAbi.connect(secondLenderLiq).revokeRole(RESCUER_ROLE, firstLenderLiq.address);

    expect(await proxyWithAbi.hasRole(LENDER_LIQ_ROLE, firstLenderLiq.address)).toEqual(false);
    expect(await proxyWithAbi.hasRole(RESCUER_ROLE, firstLenderLiq.address)).toEqual(false);
  });
  it('Any aconcagua address can void other aconcagua roles', async () => {
    // aconcagua0 revokes aconcagua1
    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua1.address)).toEqual(true);

    await proxyWithAbi.connect(aconcagua0).revokeRole(ACONCAGUA_ROLE, aconcagua1.address);

    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua1.address)).toEqual(false);

    // aconcagua2 revokes aconcagua0
    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua0.address)).toEqual(true);

    await proxyWithAbi.connect(aconcagua2).revokeRole(ACONCAGUA_ROLE, aconcagua0.address);

    expect(await proxyWithAbi.hasRole(ACONCAGUA_ROLE, aconcagua0.address)).toEqual(false);
  });
});
