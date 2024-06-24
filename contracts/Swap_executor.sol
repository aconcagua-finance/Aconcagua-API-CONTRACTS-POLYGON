// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external;
}

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SwapExecutor {
    address public owner;
    IUniversalRouter public universalRouter;

    constructor(address _universalRouter) {
        owner = msg.sender;
        universalRouter = IUniversalRouter(_universalRouter);
    }

    function transferAndSwap(
        address token,
        address from,
        uint256 amount,
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external {
        require(IERC20(token).transferFrom(from, address(this), amount), "Transfer failed");
        universalRouter.execute(commands, inputs, deadline);
    }
}
