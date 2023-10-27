// SPDX-License-Identifier: MIT
import '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';

pragma solidity 0.8.18;

contract ColateralProxy is TransparentUpgradeableProxy {
  constructor(
    address _implementation,
    address _proxyAdmin,
    bytes memory _data
  ) TransparentUpgradeableProxy(_implementation, _proxyAdmin, _data) {}
}
