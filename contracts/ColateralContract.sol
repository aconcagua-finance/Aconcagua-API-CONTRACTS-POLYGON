// SPDX-License-Identifier: MIT
import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import {Commands} from '@uniswap/universal-router/contracts/libraries/Commands.sol';
import '@uniswap/universal-router/contracts/interfaces/IUniversalRouter.sol';
import './IColateralContract.sol';
import './IWETH.sol';

pragma solidity 0.8.18;

contract ColateralContract is
  IColateralContract,
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
  // Pause role
  bytes32 public constant PAUSER_ROLE = keccak256('PAUSER');
  // Swap role
  bytes32 public constant SWAPPER_ROLE = keccak256('SWAPPER');

  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;
  EnumerableSetUpgradeable.Bytes32Set private _rolesSet;

  // Network
  uint constant RSK_ID = 30;
  address RSK_PERMIT2 = 0xFcf5986450E4A014fFE7ad4Ae24921B589D039b5;

  // Token management
  string[] public tokenNames;
  mapping(string => address) public tokenTable;

  address public rescueWalletAddress;
  address public withdrawWalletAddress;

  ISwapRouter internal swapRouter;

  constructor() {
    _disableInitializers();
  }

  function initialize(
    string[] calldata _tokenNames,
    address[] calldata _tokenAddresses,
    address[3] calldata _aconcagua,
    address _rescueWalletAddress,
    address _withdrawWalletAddress,
    address _firstLenderLiq,
    address _secondLenderLiq,
    address _swapRouterAddress,
    address _swapper
  ) external initializer {
    require(
      _aconcagua[0] != address(0) || _aconcagua[1] != address(0) || _aconcagua[2] != address(0),
      'AdminAddr'
    );
    require(_rescueWalletAddress != address(0), 'RescueAddr');
    require(_withdrawWalletAddress != address(0), 'WithdrawAddr');
    require(_firstLenderLiq != address(0), 'FirstLenderLiqAddr');
    require(_secondLenderLiq != address(0), 'SecondLenderLiqAddr');
    require(_swapRouterAddress != address(0), 'SwapRouterAddr');
    require(_swapper != address(0), 'SwapperAddr');

    __AccessControl_init_unchained();
    __ReentrancyGuard_init_unchained();

    require(_tokenNames.length == _tokenAddresses.length, 'Token name and address array lengths must match');

    for (uint i = 0; i < _tokenNames.length; i++) {
      tokenTable[_tokenNames[i]] = _tokenAddresses[i];
      tokenNames.push(_tokenNames[i]);
    }

    withdrawWalletAddress = _withdrawWalletAddress;
    rescueWalletAddress = _rescueWalletAddress;

    swapRouter = ISwapRouter(_swapRouterAddress);

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
    _grantRole(SWAPPER_ROLE, _swapper);

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
      _swapRouterAddress,
      _swapper
    );
  }

  // Version
  function version() external pure override returns (string memory) {
    return '2.0.0';
  }

  function setWithdrawWalletAddress(
    address _withdrawWalletAddress
  ) external override onlyRole(ACONCAGUA_ROLE) {
    require(_withdrawWalletAddress != address(0x0), 'Withdraw0Addr');
    withdrawWalletAddress = _withdrawWalletAddress;
  }

  function setRescueWalletAddress(
    address _rescueWalletAddress
  ) external override onlyRole(ACONCAGUA_ROLE) {
    require(_rescueWalletAddress != address(0x0), 'Rescue0Addr');
    rescueWalletAddress = _rescueWalletAddress;
  }

  function swapExactInputs(
    SwapParams[] calldata swapsParams
  ) external override onlyRole(SWAPPER_ROLE) {
    for (uint256 i = 0; i < swapsParams.length; i++) {
      SwapParams calldata swapParams = swapsParams[i];

      // Input validations
      require(swapParams.params.recipient == address(this), 'Err recipient');
      require(swapParams.params.amountOutMinimum > 0, 'Err Slipp');
      require(
        tokenTableContains(swapParams.tokenOut),
        'Err TokenOut'
      );

      // Get token and approve amount
      IERC20 token = IERC20(swapParams.tokenIn);
      require(
        swapParams.params.amountIn > 0 &&
        swapParams.params.amountIn <= token.balanceOf(address(this)),
        'Err AmountIn'
      );

      // If its RSK network
      if (block.chainid == RSK_ID) {
        uint256 originalAmount = IERC20(swapParams.tokenOut).balanceOf(address(this));
        // Send tokens to universal router
        SafeERC20.safeTransfer(token, address(swapRouter), swapParams.params.amountIn);
        // Execute swap with universalRouter
        bytes memory commands = abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN)));
        bytes[] memory inputs = new bytes[](1);
        // https://docs.uniswap.org/contracts/universal-router/technical-reference#v3_swap_exact_in
        inputs[0] = abi.encode(swapParams.params.recipient, swapParams.params.amountIn, swapParams.params.amountOutMinimum, swapParams.params.path, false);
        try IUniversalRouter(address(swapRouter)).execute(commands, inputs, swapParams.params.deadline) {
          uint256 resultAmount = IERC20(swapParams.tokenOut).balanceOf(address(this));
          emit Swap(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, resultAmount - originalAmount);
        } catch Error(string memory errorMsg) {
          emit SwapError(swapParams.tokenIn, errorMsg);
        }
      } else {
        require(token.approve(address(swapRouter), swapParams.params.amountIn), 'Err Approval');
        // Execute swap with swapRouter and revoke approval.
        try swapRouter.exactInput(swapParams.params) returns (uint256 amountOut) {
          emit Swap(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, amountOut);
        } catch Error(string memory errorMsg) {
          emit SwapError(swapParams.tokenIn, errorMsg);
        }
        require(token.approve(address(swapRouter), 0), 'Err Approval0');
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

  /**
   * @dev Returns the number `roles`. Can be used
   * together with {getRoleByIndex} to enumerate all bearers of a role.
   */
  function getRoleCount() external view virtual override returns (uint256) {
    return _rolesSet.length();
  }

  /**
   * @dev Returns one of the `roles`. `index` must be a
   * value between 0 and {getRoleCount}, non-inclusive.
   *
   * Role are not sorted in any particular way, and their ordering may
   * change at any point.
   *
   * WARNING: When using {getRoleByIndex} and {getRoleCount}, make sure
   * you perform all queries on the same block. See the following
   * https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
   * for more information.
   */
  function getRoleByIndex(uint index) external view virtual override returns (bytes32) {
    return _rolesSet.at(index);
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
