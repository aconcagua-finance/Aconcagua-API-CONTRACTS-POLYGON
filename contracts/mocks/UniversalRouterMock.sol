// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./TokenMock.sol";

interface ITokenMock {
    function transfer(address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}

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
    
    // Extraer valores  desde inputs[0] decodificándolo
    (address recipient, uint256 amountIn, uint256 amountOutMinimum, bytes memory path, bool isExactOut) = abi.decode(inputs[0], (address, uint256, uint256, bytes, bool));
    // address tokenOutAddress = 0xfc0daB187a2Da992773004C4460e3a076e9c1131;
    uint256 exchangeRate = 2000;
    uint256 amountOut = exchangeRate * amountIn; 

    address tokenOutAddress = bytesToAddress(path, path.length - 20);

    // Realizar la transferencia de tokens al proxy (proxyWithAbi)
    ITokenMock tokenOut = ITokenMock(tokenOutAddress);

    tokenOut.mint(recipient, amountOut);

    return true;
  }

    function bytesToAddress(bytes memory b, uint256 start) internal pure returns (address) {
        require(b.length >= start + 20, "Bytes array too short for address conversion");
        address addr;
        assembly {
            addr := div(mload(add(add(b, 0x20), start)), 0x1000000000000000000000000)
        }
        return addr;
    }

  function getExecuteCallInputs(uint idx) public view returns (bytes memory) {
    return executeCalls[idx].inputs[0];
  }
}
