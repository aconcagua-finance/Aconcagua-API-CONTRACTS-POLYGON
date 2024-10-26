// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// Public Libraries
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// Private Librarries
import './IColateralContract2.sol'; // Import the SwapParams struct
import './IValidatorContract.sol';
import './IPriceConsumerV3.sol';

contract ValidatorContract is IValidatorContract {
    // Custom Errors
    error AdminAddressInvalid();
    error RescueAddressInvalid();
    error WithdrawAddressInvalid();
    error FirstLenderLiqAddressInvalid();
    error SecondLenderLiqAddressInvalid();
    error TokenAddressInvalid(string token);
    error ContractAddressInvalid(string contractKey);
    error TokenNameAndAddressLengthMismatch();
    error MissingRequiredToken(string token);
    error MissingRequiredContractKey(string contractKey);
    error ContractKeysAndAddressLengthMismatch();
    error InvalidCaller();
    error RecipientError();
    error InvalidPath();
    error AmountInError();
    error TokenInError();
    error TokenOutError();
    error AmountOutMinimumTooLowOracle();
    error OracleError();

    IPriceConsumerV3 public priceConsumerV3;

    uint8 public oracleSlippage = 97;

    constructor(address _priceConsumerV3) {
        priceConsumerV3 = IPriceConsumerV3(_priceConsumerV3);
    }

    function initializeChecks(
        string[5] calldata _tokenNames,
        address[5] calldata _tokenAddresses,
        address[3] calldata _aconcagua,
        address _rescueWalletAddress,
        address _withdrawWalletAddress,
        address _firstLenderLiq,
        address _secondLenderLiq,
        string[2] calldata _contractKeys,
        address[2] calldata _contractAddresses
    ) external pure {

        // Check arrays length and token names
        if (_tokenNames.length != _tokenAddresses.length) {
            revert TokenNameAndAddressLengthMismatch();
        }

        bool[4] memory foundTokens;
        string[4] memory requiredTokenNames = ["WETH", "WBTC", "USDC", "USDT"];

        for (uint256 i = 0; i < _tokenNames.length; i++) {
            bytes32 tokenHash = keccak256(bytes(_tokenNames[i]));
            if (tokenHash == keccak256(bytes("WETH"))) foundTokens[0] = true;
            else if (tokenHash == keccak256(bytes("WBTC"))) foundTokens[1] = true;
            else if (tokenHash == keccak256(bytes("USDC"))) foundTokens[2] = true;
            else if (tokenHash == keccak256(bytes("USDT"))) foundTokens[3] = true;
        }

        for (uint256 i = 0; i < requiredTokenNames.length; i++) {
            if (!foundTokens[i]) {
                revert MissingRequiredToken(requiredTokenNames[i]);
            }
        }
        
        // Check token addresses
        for (uint256 i = 0; i < _tokenNames.length; i++) {
            if (_tokenAddresses[i] == address(0)) {
                revert TokenAddressInvalid(_tokenNames[i]);
            }
        }


        // Check admin addresses
        for (uint256 i = 0; i < _aconcagua.length; i++) {
            if (_aconcagua[i] == address(0)) {
                revert AdminAddressInvalid();
            }
        }
        if (_rescueWalletAddress == address(0)) revert RescueAddressInvalid();
        if (_withdrawWalletAddress == address(0)) revert WithdrawAddressInvalid();
        if (_firstLenderLiq == address(0)) revert FirstLenderLiqAddressInvalid();
        if (_secondLenderLiq == address(0)) revert SecondLenderLiqAddressInvalid();

        // Check contract keys and addresses length
        if (_contractKeys.length != _contractAddresses.length) {
            revert ContractKeysAndAddressLengthMismatch();
        }

        // Required contract keys
        string[2] memory requiredContractKeys = ["router", "swapper"];
        for (uint256 i = 0; i < requiredContractKeys.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < _contractKeys.length; j++) {
                if (keccak256(bytes(_contractKeys[j])) == keccak256(bytes(requiredContractKeys[i]))) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                revert MissingRequiredContractKey(requiredContractKeys[i]);
            }
        }

        // Check contract keys and addresses
        for (uint256 i = 0; i < _contractKeys.length; i++) {
            if (_contractAddresses[i] == address(0)) {
                revert ContractAddressInvalid(_contractKeys[i]);
            }
        }
    }

    function swapExactInputsChecks(
        address callingContract,
        IColateralContract2.SwapParams calldata swapParams
    ) external view override {
        if (callingContract == address(0)) {
            revert InvalidCaller();
        }

        // Ensure the recipient is the same as the calling contract
        if (swapParams.params.recipient != callingContract) {
            revert RecipientError();
        }
        IColateralContract2 colateralContract = IColateralContract2(callingContract);

         // Check tokenIn
        address WETH = colateralContract.tokenTable("WETH");
        address WBTC = colateralContract.tokenTable("WBTC");
        if (swapParams.tokenIn != WETH && swapParams.tokenIn != WBTC) {
            revert TokenInError();
        }

        // Check tokenOut
        address USDC = colateralContract.tokenTable("USDC");
        address USDT = colateralContract.tokenTable("USDT");
        if (swapParams.tokenOut != USDC && swapParams.tokenOut != USDT) {
            revert TokenOutError();
        }

        // Get token
        IERC20 token = IERC20(swapParams.tokenIn);
        if (swapParams.params.amountIn <= 0 || swapParams.params.amountIn > token.balanceOf(callingContract)) {
            revert AmountInError();
        }

        if (!validatePath(swapParams.params.path, swapParams.tokenIn, swapParams.tokenOut)) {
            revert InvalidPath();
        }

        // Chequeo con oráculo
        // Get price from Chainlink oracle
            // Get price from Chainlink oracle
        uint256 price;
        uint256 priceIn18Decimal;
        uint8 tokenInDecimals;
        uint8 tokenOutDecimals;

        if (swapParams.tokenIn == WETH) {
            price = priceConsumerV3.getLatestPrice("ETH"); 
            tokenInDecimals = 18; // WETH has 18 decimals
        } else if (swapParams.tokenIn == WBTC) {
            price = priceConsumerV3.getLatestPrice("BTC");
            tokenInDecimals = 8; // WBTC has 8 decimals
        } else {
            revert OracleError();
        }

        if (price <= 0) {
            revert OracleError();
        }

        // Get tokenOut decimals
        if (swapParams.tokenOut == USDC) {
            tokenOutDecimals = 18; // USDC has 6 decimals
        } else if (swapParams.tokenOut == USDT) {
            tokenOutDecimals = 18; // USDT has 6 decimals
        } else {
            revert TokenOutError();
        }

        // Convert price to 18 decimals
        priceIn18Decimal = price / (10**8) * (10**18);

        // Calculate oracleAmountOut in 6 decimals
        uint256 oracleAmountOut18Decimal = (swapParams.params.amountIn * uint256(priceIn18Decimal)) / (10**(tokenInDecimals));

        // Calculate amountOutMinimum in 6 decimals
        uint256 amountOutMinimum18Decimal = swapParams.params.amountOutMinimum * (10**18) / (10**tokenOutDecimals);

        // Calculate the minimum allowed amount considering slippage in 6 decimals
        uint256 minAllowedAmount18Decimal = (oracleAmountOut18Decimal * oracleSlippage) / 100;

        // Compare amountOutMinimum with minAllowedAmount
        if (amountOutMinimum18Decimal < minAllowedAmount18Decimal) {
            revert AmountOutMinimumTooLowOracle();
        }

    }

    function validatePath(bytes memory path, address tokenIn, address tokenOut) public pure override returns (bool) {
        require(path.length >= 40, "Path too short"); // At least two addresses

        // Extract the first address (20 bytes)
        address pathTokenIn = bytesToAddress(path, 0);
        if (pathTokenIn != tokenIn) {
            return false;
        }

        // Extract the last address (20 bytes)
        address pathTokenOut = bytesToAddress(path, path.length - 20);
        if (pathTokenOut != tokenOut) {
            return false;
        }

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


        function version() external pure override returns (string memory) {
            return "1.1.0";
        }
    }
