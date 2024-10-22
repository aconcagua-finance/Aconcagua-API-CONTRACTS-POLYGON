// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ACON6USDC is ERC20 {
    uint8 private _customDecimals;

    constructor(uint256 initialSupply) ERC20("ACON6USDC", "ACON6USDC") {
        _customDecimals = 6; // Fijar 6 decimales
        _mint(msg.sender, initialSupply); // Mint tokens to deployer
    }

    // Sobrescribir la función decimals() para retornar 6 decimales
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}

contract ACON6USDT is ERC20 {
    uint8 private _customDecimals;

    constructor(uint256 initialSupply) ERC20("ACON6USDT", "ACON6USDT") {
        _customDecimals = 6; // Fijar 6 decimales
        _mint(msg.sender, initialSupply); // Mint tokens to deployer
    }

    // Sobrescribir la función decimals() para retornar 6 decimales
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}

contract ACON18USDM is ERC20 {
    uint8 private _customDecimals;

    constructor(uint256 initialSupply) ERC20("ACON18USDM", "ACON18USDM") {
        _customDecimals = 18; // Fijar 6 decimales
        _mint(msg.sender, initialSupply); // Mint tokens to deployer
    }

    // Sobrescribir la función decimals() para retornar 6 decimales
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}

contract ACON8WBTC is ERC20 {
    uint8 private _customDecimals;

    constructor(uint256 initialSupply) ERC20("ACON8WBTC", "ACON8WBTC") {
        _customDecimals = 8; // Fijar 6 decimales
        _mint(msg.sender, initialSupply); // Mint tokens to deployer
    }

    // Sobrescribir la función decimals() para retornar 6 decimales
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}

contract ACON18WETH is ERC20 {
    uint8 private _customDecimals;

    constructor(uint256 initialSupply) ERC20("ACON18WETH", "ACON18WETH") {
        _customDecimals = 18; // Fijar 6 decimales
        _mint(msg.sender, initialSupply); // Mint tokens to deployer
    }

    // Sobrescribir la función decimals() para retornar 6 decimales
    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}