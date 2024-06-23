// SPDX-License-Identifier: MIT
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

pragma solidity 0.8.18;

interface IColateralContract2 {
  // Emitted when the `ColateralContract` is initialized
  event Initialize(
    address sender,
    string[5] _tokenNames,
    address[5] _tokenAddresses,
    address[3] _aconcagua,
    address _rescueWalletAddress,
    address _withdrawWalletAddress,
    address _firstLenderLiq,
    address _secondLenderLiq,
    string[3] _contractKeys,
    address[3] _contractAddresses
  );

  // Emitted when withdraw
  event Withdraw(address sender, string token, uint256 amount);
  // Emitted when rescue
  event Rescue(address sender, string token, uint256 amount, address to);
  // Emitted when swap is done
  event Swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
  // Emitted when swap fails
  event SwapError(address tokenIn, string msg);
    // Emitted when Quote is done
  event Quote(address tokenIn, address tokenOut, uint256 amountIn, uint256 quotedAmountOut);
  // Emitted when Quote fails
  event QuoteError(address tokenIn, address tokenOut, uint256 amountIn, string msg);

  struct SwapParams {
    ISwapRouter.ExactInputParams params;
    address tokenIn;
    address tokenOut;
  }

  function version() external view returns (string memory);

  function setWithdrawWalletAddress(address _withdrawWalletAddress) external;

  function setRescueWalletAddress(address _rescueWalletAddress) external;

  function withdraw(uint256 _amount, string calldata _tokenSymbol) external;

  function balanceOf(string memory _tokenSymbol) external view returns (uint256);

  function rescue(uint256 _amount, string calldata _tokenSymbol) external;

  function getBalances() external view returns (uint256[] memory);

  function getRoleCount() external view returns (uint256);

  function getRoleByIndex(uint index) external view returns (bytes32);

  function swapExactInputs(SwapParams[] calldata swapsParams) external;
}