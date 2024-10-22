// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceConsumerV3 {
    function getLatestPrice(string memory token) external view returns (uint);
}
