// SPDX-License-Identifier: MIT
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';

pragma solidity 0.8.18;

contract ColateralContractOper is AccessControlEnumerableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // Admin role
    bytes32 public constant LENDER_LIQ_ROLE = keccak256('LENDER_LIQ');

    address public withdrawWalletAddress;

    event Withdraw(address indexed withdrawWalletAddress, address indexed tokenAddress, uint256 amount);

    function initialize(address _withdrawWalletAddress, address _firstLenderLiq, address _secondLenderLiq) external initializer {
        require(_withdrawWalletAddress != address(0), 'WithdrawAddr');
        require(_firstLenderLiq != address(0), 'FirstLenderLiqAddr');
        require(_secondLenderLiq != address(0), 'SecondLenderLiqAddr');

        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();

        withdrawWalletAddress = _withdrawWalletAddress;

        _setupRole(LENDER_LIQ_ROLE, _firstLenderLiq);
        _setupRole(LENDER_LIQ_ROLE, _secondLenderLiq);
    }

    function withdrawX(uint256 _amount, address _tokenAddress) external onlyRole(LENDER_LIQ_ROLE) nonReentrant {
        IERC20(_tokenAddress).safeTransfer(withdrawWalletAddress, _amount);
        emit Withdraw(withdrawWalletAddress, _tokenAddress, _amount);
    }
}