// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../IPriceConsumerV3.sol";

contract PriceConsumerV3Mock is IPriceConsumerV3 {
    function getLatestPrice(string memory token) public pure override returns (uint) {
        if (keccak256(abi.encodePacked(token)) == keccak256(abi.encodePacked("ETH"))) {
            return 2000 * 10**8; // Mock price of ETH in USD
        } else if (keccak256(abi.encodePacked(token)) == keccak256(abi.encodePacked("BTC"))) {
            return 30000 * 10**18; // Mock price of BTC in USD
        } else {
            revert("OracleUnknownToken");
        }
    }
}
