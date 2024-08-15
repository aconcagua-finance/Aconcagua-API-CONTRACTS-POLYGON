// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract TokenMock {
  struct TransferCall {
    address to;
    address from;
    uint256 amount;
  }

  TransferCall[] public transferCalls;

  function balanceOf(address addr) external returns (uint256) {
    return 1000 * 10 ** 18;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    transferCalls.push(TransferCall(to, msg.sender, amount));

    return true;
  }
}
