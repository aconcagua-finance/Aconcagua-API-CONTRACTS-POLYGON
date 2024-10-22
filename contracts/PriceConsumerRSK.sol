// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOMOCOracle {
    function getPriceDataByName(string calldata name) external view returns (uint8 data, uint24 heartbeat, uint32 timestamp, uint128 price);
}

contract PriceConsumerRSK {
    IOMOCOracle public priceOracle;

    // The address of the OMOC BTC/USD oracle on Rootstock
    address public constant ORACLE_ADDRESS = 0xDa9A63D77406faa09d265413F4E128B54b5057e0;

    constructor() {
        // Initialize the oracle contract with the correct address
        priceOracle = IOMOCOracle(ORACLE_ADDRESS);
    }

    /**
     * Returns the latest price for a given asset
     * Accepts "BTC" and maps it to "RBTC-USD" to fetch the price from the oracle
     * Provides the price as a uint256 for compatibility with the validator
     */
    function getLatestPrice(string memory asset) public view returns (uint256) {
        string memory oraclePair;

        // Map "BTC" to "RBTC-USD" for the oracle
        if (keccak256(abi.encodePacked(asset)) == keccak256(abi.encodePacked("BTC"))) {
            oraclePair = "WRBTC-rUSDT";
        } else {
            revert("Asset not supported");
        }

        // Fetch the price data from the OMOC oracle
        ( , , , uint128 price) = priceOracle.getPriceDataByName(oraclePair);

        // Ensure the price is valid and return it as uint256
        require(price > 0, "Price data is invalid");
        return uint256(price);
    }
}
