
// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract TokenMock {
    // Stores the transfer details
    struct TransferCall {
        address to;
        address from;
        uint256 amount;
    }

    // Mapping to store balances of each address
    mapping(address => uint256) private balances;

    // Array to store all transfer calls
    TransferCall[] public transferCalls;

    // Event for transfers
    event Transfer(address indexed from, address indexed to, uint256 value);

    // Constructor with a default initial supply of 0 for the deployer
    constructor() {
        balances[msg.sender] = 0; // Default balance of 0 for the deployer
    }

    // Function to check the balance of a specific address
    function balanceOf(address addr) external view returns (uint256) {
        return balances[addr];
    }

    // Function to transfer tokens from the sender to a recipient
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Decrease the balance of the sender
        balances[msg.sender] -= amount;

        // Increase the balance of the recipient
        balances[to] += amount;

        // Log the transfer in the transferCalls array
        transferCalls.push(TransferCall(to, msg.sender, amount));

        // Emit a transfer event
        emit Transfer(msg.sender, to, amount);

        return true;
    }

    // Function to mint new tokens to a specific address
    function mint(address to, uint256 amount) external {
        balances[to] += amount;
    }

    // Function to burn tokens from the sender's balance
    function burn(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance to burn");
        balances[msg.sender] -= amount;
    }
}
