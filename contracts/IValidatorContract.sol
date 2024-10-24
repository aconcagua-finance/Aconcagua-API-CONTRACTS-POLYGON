// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import './IColateralContract2.sol'; // Import the SwapParams struct

interface IValidatorContract {
    function initializeChecks(
        string[5] calldata _tokenNames,
        address[5] calldata _tokenAddresses,
        address[3] calldata _aconcagua,
        address _rescueWalletAddress,
        address _withdrawWalletAddress,
        address _firstLenderLiq,
        address _secondLenderLiq,
        string[2] calldata _contractKeys,
        address[2] calldata _contractAddresses
    ) external pure;

    function swapExactInputsChecks(
        address sender, 
        IColateralContract2.SwapParams calldata swapParams
    ) external view;

    function validatePath(bytes memory path, address tokenIn, address tokenOut) external pure returns (bool);

    function version() external view returns (string memory);

    event SwapError(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, string reason);
}
