async function main() {
  const { ethers } = require('hardhat');
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('Private key not provided in the DEPLOYER_PRIVATE_KEY environment variable.');
  }

  // Create a signer using the private key
  const provider = new ethers.providers.JsonRpcProvider(process.env.HARDHAT_API_URL);

  const deployer = new ethers.Wallet(privateKey, provider);

  console.log('Deploying contracts with the account:', deployer.address);

  // Get the balance of the wallet before deployment
  const balanceBefore = await deployer.getBalance();
  console.log(
    'Balance before deployment:',
    ethers.utils.formatUnits(balanceBefore, 'ether'),
    'MATIC'
  );

  console.log('Deploying contracts with the account:', deployer.address);

  // Adjust gas price based on Polygon network conditions
  const gasPrice = ethers.utils.parseUnits('1', 'gwei'); // Adjust the gas price accordingly
  const gasLimit = 3000000; // Adjust the gas limit accordingly

  // Deploy the contract using the specified signer, gas price, and gas limit
  const token = await ethers.deployContract('ColateralContract', [], {
    from: deployer,
    gasPrice,
    gasLimit,
  });

  console.log('Contract deployed to address:', token.address);

  // Get the balance of the wallet after deployment
  const balanceAfter = await deployer.getBalance();
  console.log(
    'Balance after deployment:',
    ethers.utils.formatUnits(balanceAfter, 'ether'),
    'MATIC'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
