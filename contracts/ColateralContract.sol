// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "./IColateralContract.sol";

pragma solidity ^0.8.0;

contract ColateralContract is
    IColateralContract,
    AccessControlEnumerableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using Strings for uint256;

    // Admin role
    bytes32 public constant ACONCAGUA_ROLE = keccak256("ACONCAGUA");
    // Lender liquidity role
    bytes32 public constant LENDER_LIQ_ROLE = keccak256("LENDER_LIQ");
    // Rescuer role
    bytes32 public constant RESCUER_ROLE = keccak256("RESCUER");
    // Pause role
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER");
    // Swap role
    bytes32 public constant SWAPPER_ROLE = keccak256("SWAPPER");

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;
    EnumerableSetUpgradeable.Bytes32Set private _rolesSet;

    // Supported Tokens
    string public constant USDC = "USDC";
    string public constant USDT = "USDT";
    string public constant WBTC = "WBTC";
    string public constant WETH = "WETH";
    // Token => Token Address
    mapping(string => address) public tokenAddress;

    // Token => Withdrawal Limit Per Period
    mapping(string => uint256) public withdrawalLimitPerPeriod;
    mapping(string => uint256) public tokensWithdrawnInTheLastPeriod;

    // Time Period
    uint public startTimePeriod;
    uint public endTimePeriod;
    address public rescueWalletAddress;
    address public withdrawWalletAddress;

    ISwapRouter internal swapRouter;

    constructor() initializer {}

    function initialize(
        address _usdcTokenAddress,
        address _usdtTokenAddress,
        address _wbtcTokenAddress,
        address _wethTokenAddress,
        address _aconcagua,
        address _rescueWalletAddress,
        address _withdrawWalletAddress,
        address _firstLenderLiq,
        address _secondLenderLiq,
        address _swapRouterAddress,
        address _swapperAddress
    ) external initializer {
        require(_aconcagua != address(0), "Admin is the zero address");
        require(_rescueWalletAddress != address(0), "Rescue address is zero address");
        require(_withdrawWalletAddress != address(0), "Withdraw address is zero address");
        require(_firstLenderLiq != address(0), "First Lender Liq is zero address");
        require(_secondLenderLiq != address(0), "Second Lender Liq is zero address");
        require(_swapRouterAddress != address(0), "SwapRouter is zero address");
        require(_swapperAddress != address(0), "Swapper address is zero address");

        __AccessControl_init_unchained();
        __Pausable_init_unchained();
        __ReentrancyGuard_init_unchained();
        tokenAddress[USDC] = _usdcTokenAddress;
        tokenAddress[USDT] = _usdtTokenAddress;
        tokenAddress[WBTC] = _wbtcTokenAddress;
        tokenAddress[WETH] = _wethTokenAddress;

        startTimePeriod = block.timestamp;
        endTimePeriod = startTimePeriod + 24 hours;

        withdrawalLimitPerPeriod[USDC] = type(uint256).max;
        withdrawalLimitPerPeriod[USDT] = type(uint256).max;
        withdrawalLimitPerPeriod[WBTC] = type(uint256).max;
        withdrawalLimitPerPeriod[WETH] = type(uint256).max;

        withdrawWalletAddress = _withdrawWalletAddress;
        rescueWalletAddress = _rescueWalletAddress;

        swapRouter = ISwapRouter(_swapRouterAddress);

        // Add roles to the set of Roles for later tracking
        _rolesSet.add(ACONCAGUA_ROLE);
        _rolesSet.add(LENDER_LIQ_ROLE);
        _rolesSet.add(RESCUER_ROLE);
        _rolesSet.add(PAUSER_ROLE);
        _rolesSet.add(SWAPPER_ROLE);

        _grantRole(ACONCAGUA_ROLE, _aconcagua);
        _grantRole(LENDER_LIQ_ROLE, _firstLenderLiq);
        _grantRole(LENDER_LIQ_ROLE, _secondLenderLiq);
        _grantRole(SWAPPER_ROLE, _swapperAddress);

        _setRoleAdmin(ACONCAGUA_ROLE, ACONCAGUA_ROLE);
        _setRoleAdmin(LENDER_LIQ_ROLE, LENDER_LIQ_ROLE);
        _setRoleAdmin(RESCUER_ROLE, ACONCAGUA_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ACONCAGUA_ROLE);
        _setRoleAdmin(SWAPPER_ROLE, SWAPPER_ROLE);

        // Emit initialize event
        emit Initialize(
            msg.sender,
            _usdcTokenAddress,
            _usdtTokenAddress,
            _wbtcTokenAddress,
            _wethTokenAddress,
            _aconcagua,
            _rescueWalletAddress,
            _withdrawWalletAddress,
            _firstLenderLiq,
            _secondLenderLiq,
            _swapRouterAddress,
            _swapperAddress
        );
    }

    // Version
    function version() external override pure returns (string memory) {
        return "1.0.0";
    }

    function setWithdrawWalletAddress(address _withdrawWalletAddress) external override onlyRole(ACONCAGUA_ROLE) {
        require(_withdrawWalletAddress != address(0x0), "WithdrawWallet is zero address");
        withdrawWalletAddress = _withdrawWalletAddress;
    }

    function setRescueWalletAddress(address _rescueWalletAddress) external override onlyRole(ACONCAGUA_ROLE) {
        require(_rescueWalletAddress != address(0x0), "RescueWallet is zero address");
        rescueWalletAddress = _rescueWalletAddress;
    }

    function setStartTimePeriod(uint _startTimePeriod) external override onlyRole(ACONCAGUA_ROLE) {
        require(_startTimePeriod < startTimePeriod, "New startTimePeriod must be before current startTimePeriod");
        require(_startTimePeriod + 24 hours > block.timestamp, "New endTimePeriod must be after current time");
        startTimePeriod = _startTimePeriod;
        endTimePeriod = startTimePeriod + 24 hours;
    }

    function setTokenAddress(address _tokenAddress, string calldata _tokenSymbol) external override onlyRole(ACONCAGUA_ROLE) {
        address oldTokenAddress = tokenAddress[_tokenSymbol];
        tokenAddress[_tokenSymbol] = _tokenAddress;
        emit TokenAddressChange(msg.sender, _tokenSymbol, oldTokenAddress, _tokenAddress);
    }

    function setWithdrawalLimitPerPeriod(
        uint256 _withdrawalLimitPerPeriod,
        string calldata _tokenSymbol
    ) external override onlyRole(ACONCAGUA_ROLE) {
        uint256 oldWithdrawalLimitPerPeriod = withdrawalLimitPerPeriod[_tokenSymbol];
        withdrawalLimitPerPeriod[_tokenSymbol] = _withdrawalLimitPerPeriod;
        emit WithdrawalLimitChange(msg.sender, _tokenSymbol, oldWithdrawalLimitPerPeriod, _withdrawalLimitPerPeriod);
    }

    function swapExactInputs(SwapParams[] calldata swapsParams) external override onlyRole(SWAPPER_ROLE) {
        require(swapsParams.length > 0, "Empty input array");  

        for (uint256 i = 0; i < swapsParams.length; i++) {
            SwapParams calldata swapParams = swapsParams[i];

            // Input validations
            require(swapParams.params.recipient == address(this), "Swap recipient is not the Vault Proxy address");
            require(swapParams.params.amountOutMinimum > 0, "AmountOutMinimum should be positive");

            // Get token and approve amount
            IERC20 token = IERC20(address(swapParams.tokenIn));
            require(swapParams.params.amountIn > 0 && swapParams.params.amountIn <= token.balanceOf(address(this)), "Amounts should be within balance");
            require(token.approve(address(swapRouter), swapParams.params.amountIn), "Approval failed");

            // Execute swap and revoke approval.
            try swapRouter.exactInput(swapParams.params) returns (uint256 amountOut) {
                emit Swap(swapParams.tokenIn, swapParams.tokenOut, swapParams.params.amountIn, amountOut);
                require(token.approve(address(swapRouter), 0), "Revoke Approval failed");
            } catch Error(string memory errorMsg) {
                emit SwapError(swapParams.tokenIn, errorMsg);
                require(token.approve(address(swapRouter), 0), "Revoke Approval failed");
            }
        }
    }

    function _checkPeriodLimits() internal {
        if (block.timestamp > endTimePeriod) {
            // Take only the integer part of the division
            uint daysWithoutWithdraw = (block.timestamp - endTimePeriod) / (24 hours);
            startTimePeriod = endTimePeriod + (daysWithoutWithdraw * 24 hours);
            endTimePeriod = startTimePeriod + 24 hours;
            tokensWithdrawnInTheLastPeriod[USDC] = 0;
            tokensWithdrawnInTheLastPeriod[USDT] = 0;
            tokensWithdrawnInTheLastPeriod[WBTC] = 0;
            tokensWithdrawnInTheLastPeriod[WETH] = 0;
        }
    }

    function withdraw(
        uint256 _amount,
        string calldata _tokenSymbol
    ) external override onlyRole(LENDER_LIQ_ROLE) whenNotPaused nonReentrant {
        _checkPeriodLimits();
        require(
            withdrawalLimitPerPeriod[_tokenSymbol] >= _amount + tokensWithdrawnInTheLastPeriod[_tokenSymbol],
            "Withdrawal limit exceeded"
        );
        tokensWithdrawnInTheLastPeriod[_tokenSymbol] += _amount;
        // transfers Tokens that belong to your contract to the withdraw address
        SafeERC20.safeTransfer(IERC20(tokenAddress[_tokenSymbol]), withdrawWalletAddress, _amount);
        emit Withdraw(withdrawWalletAddress, _tokenSymbol, _amount);
    }

    function balanceOf(string memory _tokenSymbol) public override view returns (uint256) {
        // returns balance of token  in contract.
        IERC20 token = IERC20(tokenAddress[_tokenSymbol]);
        return token.balanceOf(address(this));
    }

    function rescue(
        uint256 _amount,
        string calldata _tokenSymbol
    ) external override onlyRole(RESCUER_ROLE) whenNotPaused nonReentrant {
        // transfers Tokens that belong to your contract to the sender address
        SafeERC20.safeTransfer(IERC20(tokenAddress[_tokenSymbol]), rescueWalletAddress, _amount);
        emit Rescue(_msgSender(), _tokenSymbol, _amount, rescueWalletAddress);
    }

    function getBalances() external override view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](5);
        balances[0] = address(this).balance;
        balances[1] = balanceOf(USDC);
        balances[2] = balanceOf(USDT);
        balances[3] = balanceOf(WBTC);
        balances[4] = balanceOf(WETH);

        return balances;
    }

    function _checkPauserRole() internal view {
        require(hasRole(PAUSER_ROLE, _msgSender()) || hasRole(ACONCAGUA_ROLE, _msgSender()), "Caller is not a pauser");
    }

    function pause() external {
        _checkPauserRole();
        _pause();
    }

    function unpause() external {
        _checkPauserRole();
        _unpause();
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
}

