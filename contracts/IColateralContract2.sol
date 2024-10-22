// SPDX-License-Identifier: MIT
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

pragma solidity 0.8.18;

interface IColateralContract2 {
    struct SwapParams {
        ISwapRouter.ExactInputParams params;
        address tokenIn;
        address tokenOut;
    }

    function initialize(
        address _validator,
        string[5] calldata _tokenNames,
        address[5] calldata _tokenAddresses,
        address[3] calldata _aconcagua,
        address _rescueWalletAddress,
        address _withdrawWalletAddress,
        address _firstLenderLiq,
        address _secondLenderLiq,
        string[2] calldata _contractKeys,
        address[2] calldata _contractAddresses
    ) external;

    function version() external pure returns (string memory);

    function setWithdrawWalletAddress(address _withdrawWalletAddress) external;

    function setRescueWalletAddress(address _rescueWalletAddress) external;

    function swapExactInputs(SwapParams[] calldata swapsParams) external;

    function withdraw(uint256 _amount, string calldata _tokenSymbol) external;

    function balanceOf(string memory _tokenSymbol) external view returns (uint256);

    function getBalances() external view returns (uint256[] memory);

    function rescue(uint256 _amount, string calldata _tokenSymbol) external;

    function tokenTable(string memory) external view returns (address);

    function tokenNames(uint256) external view returns (string memory);

      event Initialize(
    address sender,
    string[5] _tokenNames,
    address[5] _tokenAddresses,
    address[3] _aconcagua,
    address _rescueWalletAddress,
    address _withdrawWalletAddress,
    address _firstLenderLiq,
    address _secondLenderLiq,
    string[2] _contractKeys,
    address[2] _contractAddresses
  );

  event Withdraw(address sender, string token, uint256 amount);
  event Rescue(address sender, string token, uint256 amount, address to);
  event SwapStarted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn);
  event Swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
  event SwapError(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOutMinimum, uint256 amountOut, string reason);
}
