// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PriceConsumerRSKTESTNET {
    
    /**
     * Returns the latest price for a given asset.
     * Returns 6000000000000 for "BTC" and 8000000000000 for "BPRO".
     */
    function getLatestPrice(string memory asset) public pure returns (uint256) {
        if (keccak256(abi.encodePacked(asset)) == keccak256(abi.encodePacked("BTC"))) {
            return 6000000000000;
        } else if (keccak256(abi.encodePacked(asset)) == keccak256(abi.encodePacked("BPRO"))) {
            return 8000000000000;
        } else {
            revert("Asset not supported");
        }
    }
}
