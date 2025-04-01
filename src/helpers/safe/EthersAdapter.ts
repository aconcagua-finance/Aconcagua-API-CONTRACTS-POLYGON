/* eslint-disable @typescript-eslint/no-var-requires */
import { ethers } from 'ethers';
import { EthersAdapter } from '@safe-global/protocol-kit';

export const getAdapter = (wallet: any) => {
  // const network = getNetwork();

  // if (!process.env.ALCHEMY_KEY) {
  //   throw new Error('PLEASE PROVIDE A VALID ALCHEMY KEY');
  // }

  // const provider = new ethers.providers.AlchemyProvider(
  //   network.toLowerCase(),
  //   process.env.ALCHEMY_KEY
  // );

  // if (!process.env.PRIVATE_KEY) {
  //   throw new Error('PLEASE PROVIDE A VALID PRIVATE_KEY');
  // }

  // const safeOwner: ethers.Wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // const safeOwner: ethers.Wallet = new ethers.Wallet(wallet);
  const safeOwner: any = wallet;

  return new EthersAdapter({
    ethers,
    signerOrProvider: safeOwner,
  });
};

// Minimal EthAdapter for read-only operations
export class MinimalEthAdapter {
  async getEip3770Address(address: string): Promise<{ address: string }> {
    if (!address) {
      throw new Error('Invalid address');
    }
    // Return the address as-is
    return { address };
  }
}
