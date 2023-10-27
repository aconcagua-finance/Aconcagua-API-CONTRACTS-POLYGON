// SPDX-License-Identifier: UNLICENSED
import '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol';

pragma solidity 0.8.18;

contract ColateralProxyAdmin is ProxyAdmin {
  constructor(address _owner) {
    _transferOwnership(_owner);
  }
}
