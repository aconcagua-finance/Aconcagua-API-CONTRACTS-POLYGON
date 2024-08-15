// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract UniversalRouterMock {
  struct ExecuteCall {
    bytes commands;
    bytes[] inputs;
    uint256 deadline;
  }

  ExecuteCall[] public executeCalls;

  function execute(
    bytes memory commands,
    bytes[] memory inputs,
    uint256 deadline
  ) external returns (bool) {
    executeCalls.push(ExecuteCall(commands, inputs, deadline));

    return true;
  }

  function getExecuteCallInputs(uint idx) public view returns (bytes memory) {
    return executeCalls[idx].inputs[0];
  }
}
