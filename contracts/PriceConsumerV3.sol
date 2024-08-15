// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./IPriceConsumerV3.sol";

contract PriceConsumerV3 is IPriceConsumerV3 {
    AggregatorV3Interface internal ethPriceFeed;
    AggregatorV3Interface internal btcPriceFeed;

    error OracleUnknownToken(string token);
    error NegativePrice(int price);

    /**
     * Network: Sepolia
     * Aggregators:
     * ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306
     * BTC/USD: 0xA39434A63A52E749F02807ae27335515BA4b07F7
     */
    constructor() {
        ethPriceFeed = AggregatorV3Interface(0xF9680D99D6C9589e2a93a78A04A279e509205945);
        btcPriceFeed = AggregatorV3Interface(0xc907E116054Ad103354f2D350FD2514433D57F6f);
    }

    /**
     * Returns the latest price of the specified token in USD
     * @param token The token symbol (e.g., "ETH" or "BTC")
     * @return The latest price of the specified token as a uint
     */
    function getLatestPrice(string memory token) public view returns (uint) {
        AggregatorV3Interface priceFeed;

        if (keccak256(abi.encodePacked(token)) == keccak256(abi.encodePacked("ETH"))) {
            priceFeed = ethPriceFeed;
        } else if (keccak256(abi.encodePacked(token)) == keccak256(abi.encodePacked("BTC"))) {
            priceFeed = btcPriceFeed;
        } else {
            revert OracleUnknownToken(token);
        }

        (, int price, , , ) = priceFeed.latestRoundData();
        
        if (price < 0) {
            revert NegativePrice(price);
        }
        
        return uint(price);
    }
}