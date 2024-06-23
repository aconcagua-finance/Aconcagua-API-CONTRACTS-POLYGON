// SPDX-License-Identifier: MIT
import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol';
import {Commands} from '@uniswap/universal-router/contracts/libraries/Commands.sol';
import '@uniswap/universal-router/contracts/interfaces/IUniversalRouter.sol';

import './IColateralContract2.sol';
import './IWETH.sol';

pragma solidity 0.8.18;

contract ColateralContract2 is
  IColateralContract2,
  AccessControlEnumerableUpgradeable,
  ReentrancyGuardUpgradeable
{
  using Strings for uint256;

  // Admin role
  bytes32 public constant ACONCAGUA_ROLE = keccak256('ACONCAGUA');
  // Lender liquidity role
  bytes32 public constant LENDER_LIQ_ROLE = keccak256('LENDER_LIQ');
  // Rescuer role
  bytes32 public constant RESCUER_ROLE = keccak256('RESCUER');
  // Swap role
  bytes32 public constant SWAPPER_ROLE = keccak256('SWAPPER');

  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;
  EnumerableSetUpgradeable.Bytes32Set private _rolesSet;

  // Network
  uint constant RSK_ID = 30;

  // Token management
  string[5] public tokenNames;
  mapping(string => address) public tokenTable;

  address public rescueWalletAddress;
  address public withdrawWalletAddress;

  string[3] public contractKeys;
  mapping(string => address) public contractAddresses;


  ISwapRouter internal swapRouter;
  IQuoter internal quoter; 

  // Custom Errors
  error AdminAddressInvalid();
  error RescueAddressInvalid();
  error WithdrawAddressInvalid();
  error FirstLenderLiqAddressInvalid();
  error SecondLenderLiqAddressInvalid();
  error TokenNameAndAddressLengthMismatch();
  error TokenInError();
  error RecipientError();
  error TokenOutError();
  error AmountInError();
  error AmountOutMinimumTooLow();

  constructor() {
    _disableInitializers();
  }

  function initialize(
    string[5] calldata _tokenNames,
    address[5] calldata _tokenAddresses,
    address[3] calldata _aconcagua,
    address _rescueWalletAddress,
    address _withdrawWalletAddress,
    address _firstLenderLiq,
    address _secondLenderLiq,
    string[3] calldata _contractKeys,
    address[3] calldata _contractAddresses
  ) external initializer {
    if (_aconcagua[0] == address(0) && _aconcagua[1] == address(0) && _aconcagua[2] == address(0)) {
      revert AdminAddressInvalid();
    }
    if (_rescueWalletAddress == address(0)) {
      revert RescueAddressInvalid();
    }
    if (_withdrawWalletAddress == address(0)) {
      revert WithdrawAddressInvalid();
    }
    if (_firstLenderLiq == address(0)) {
      revert FirstLenderLiqAddressInvalid();
    }
    if (_secondLenderLiq == address(0)) {
      revert SecondLenderLiqAddressInvalid();
    }

    __AccessControl_init_unchained();
    __ReentrancyGuard_init_unchained();

    if (_tokenNames.length != _tokenAddresses.length) {
      revert TokenNameAndAddressLengthMismatch();
    }


    for (uint i = 0; i < _tokenNames.length; i++) {
      tokenTable[_tokenNames[i]] = _tokenAddresses[i];
      tokenNames[i] = _tokenNames[i];
    }

    withdrawWalletAddress = _withdrawWalletAddress;
    rescueWalletAddress = _rescueWalletAddress;

    // Set the contract keys
    for (uint i = 0; i < _contractKeys.length; i++) {
      contractKeys[i] = _contractKeys[i];
      contractAddresses[contractKeys[i]] = _contractAddresses[i];
    }

    swapRouter = ISwapRouter(contractAddresses['router']);
    quoter = IQuoter(contractAddresses['quoter']); 

    // Add roles to the set of Roles for later tracking
    _rolesSet.add(ACONCAGUA_ROLE);
    _rolesSet.add(LENDER_LIQ_ROLE);
    _rolesSet.add(RESCUER_ROLE);
    _rolesSet.add(SWAPPER_ROLE);

    _grantRole(ACONCAGUA_ROLE, _aconcagua[0]);
    _grantRole(ACONCAGUA_ROLE, _aconcagua[1]);
    _grantRole(ACONCAGUA_ROLE, _aconcagua[2]);
    _grantRole(LENDER_LIQ_ROLE, _firstLenderLiq);
    _grantRole(LENDER_LIQ_ROLE, _secondLenderLiq);
    _grantRole(RESCUER_ROLE, _firstLenderLiq);
    _grantRole(RESCUER_ROLE, _secondLenderLiq);
    _grantRole(SWAPPER_ROLE, contractAddresses['swapper']);

    _setRoleAdmin(ACONCAGUA_ROLE, ACONCAGUA_ROLE);
    _setRoleAdmin(LENDER_LIQ_ROLE, LENDER_LIQ_ROLE);
    _setRoleAdmin(RESCUER_ROLE, RESCUER_ROLE);
    _setRoleAdmin(SWAPPER_ROLE, ACONCAGUA_ROLE);

    // Emit initialize event
    emit Initialize(
      msg.sender,
      _tokenNames,
      _tokenAddresses,
      _aconcagua,
      _rescueWalletAddress,
      _withdrawWalletAddress,
      _firstLenderLiq,
      _secondLenderLiq,
      contractKeys,
      _contractAddresses
    );
  }

  function version() external pure override returns (string memory) {
    return '2.0.0';
  }

  function setWithdrawWalletAddress(
    address _withdrawWalletAddress
  ) external override onlyRole(ACONCAGUA_ROLE) {
    if (_withdrawWalletAddress == address(0x0)) {
      revert WithdrawAddressInvalid();
    }
    withdrawWalletAddress = _withdrawWalletAddress;
  }

  function setRescueWalletAddress(
    address _rescueWalletAddress
  ) external override onlyRole(ACONCAGUA_ROLE) {
    if (_rescueWalletAddress == address(0x0)) {
      revert RescueAddressInvalid();
    }
    rescueWalletAddress = _rescueWalletAddress;
  }

  function swapExactInputs(
    SwapParams[] calldata swapsParams
  ) external override onlyRole(SWAPPER_ROLE) {
    // Define the allowed tokens
    address WETH = tokenTable['WETH'];
    address WBTC = tokenTable['WBTC'];
    address USDC = tokenTable['USDC'];
    address USDT = tokenTable['USDT'];

    for (uint256 i = 0; i < swapsParams.length; i++) {
      SwapParams calldata swapParams = swapsParams[i];

      // Input validations
      if (swapParams.params.recipient != address(this)) {
        revert RecipientError();
      }

      if (swapParams.tokenOut != USDC && swapParams.tokenOut != USDT) {
        revert TokenOutError();
      }

      // Check if tokenIn is either WETH or WBTC
      if (swapParams.tokenIn != WETH && swapParams.tokenIn != WBTC) {
        revert TokenInError();
      }

      // Get the quote for the swap

      uint256 quotedAmountOut;
      try quoter.quoteExactInput(swapParams.params.path, swapParams.params.amountIn) returns (uint256 amountOut) {
            quotedAmountOut = amountOut;
            emit Quote(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, quotedAmountOut);
        } catch Error(string memory errorMsg) {
            emit QuoteError(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, errorMsg);
        }
      
      // Check if amountOutMinimum is more than zero and at least 98% of quotedAmountOut
      if (swapParams.params.amountOutMinimum <= 0 || swapParams.params.amountOutMinimum < (quotedAmountOut * 98) / 100) {
        revert AmountOutMinimumTooLow();
      }

      // Get token
      IERC20 token = IERC20(swapParams.tokenIn);
      if (swapParams.params.amountIn <= 0 || swapParams.params.amountIn > token.balanceOf(address(this))) {
        revert AmountInError();
      }

      uint256 originalAmount = IERC20(swapParams.tokenOut).balanceOf(address(this));
      // Send tokens to universal router
      SafeERC20.safeTransfer(token, contractAddresses['router'], swapParams.params.amountIn);
      // Execute swap with universalRouter
      bytes memory commands = abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN)));
      bytes[] memory inputs = new bytes[](1);
      // https://docs.uniswap.org/contracts/universal-router/technical-reference#v3_swap_exact_in
      inputs[0] = abi.encode(swapParams.params.recipient, swapParams.params.amountIn, swapParams.params.amountOutMinimum, swapParams.params.path, false);
      try IUniversalRouter(contractAddresses['router']).execute(commands, inputs, swapParams.params.deadline) {
        uint256 resultAmount = IERC20(swapParams.tokenOut).balanceOf(address(this));
        emit Swap(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, resultAmount - originalAmount);
      } catch Error(string memory errorMsg) {
        emit SwapError(swapParams.tokenIn, errorMsg);
      }
    }
  }

  function tokenTableContains(address token) internal view returns (bool) {
    for (uint i = 0; i < tokenNames.length; i++) {
      if (tokenTable[tokenNames[i]] == token) {
        return true;
      }
    }
    return false;
  }

  function withdraw(
    uint256 _amount,
    string calldata _tokenSymbol
  ) external override onlyRole(LENDER_LIQ_ROLE) nonReentrant {
    // transfers Tokens that belong to your contract to the withdraw address
    SafeERC20.safeTransfer(IERC20(tokenTable[_tokenSymbol]), withdrawWalletAddress, _amount);
    emit Withdraw(withdrawWalletAddress, _tokenSymbol, _amount);
  }

  function balanceOf(string memory _tokenSymbol) public view override returns (uint256) {
    // returns balance of token in contract.
    IERC20 token = IERC20(tokenTable[_tokenSymbol]);
    return token.balanceOf(address(this));
  }

  function getBalances() external view override returns (uint256[] memory) {
    uint256[] memory balances = new uint256[](tokenNames.length + 1);
    balances[0] = address(this).balance;
    for (uint i = 1; i <= tokenNames.length; i++) {
      balances[i] = balanceOf(tokenNames[i-1]);
    }
    return balances;
  }

  function rescue(
    uint256 _amount,
    string calldata _tokenSymbol
  ) external override onlyRole(RESCUER_ROLE) nonReentrant {
    // transfers Tokens that belong to your contract to the sender address
    SafeERC20.safeTransfer(IERC20(tokenTable[_tokenSymbol]), rescueWalletAddress, _amount);
    emit Rescue(_msgSender(), _tokenSymbol, _amount, rescueWalletAddress);
  }

  function getRoleCount() external view virtual override returns (uint256) {
    return _rolesSet.length();
  }

  function getRoleByIndex(uint index) external view virtual override returns (bytes32) {
    return _rolesSet.at(index);
  }

  function getTokenNames() external view returns (string[5] memory) {
    return tokenNames;
  }

  receive() external payable {
    // If its RSK network
    if (block.chainid == RSK_ID) {
      IWETH(tokenTable['WETH']).deposit{value: msg.value}();
    } else {
      revert("Not payable on this chain");
    }
  }
}
