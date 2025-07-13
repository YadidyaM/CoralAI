import { Network, TatumSDK } from '@tatumio/tatum';

// Enhanced Tatum Service for User-Specific Wallet and NFT Management
class TatumService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private solanaSDK: any | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ethereumSDK: any | null = null;
  private initialized: boolean = false;
  private environment: 'testnet' | 'mainnet' = 'testnet';

  constructor() {
    this.environment = (import.meta.env.VITE_TATUM_ENVIRONMENT || 'testnet') as 'testnet' | 'mainnet';
    this.initializeSDK();
  }

  private async initializeSDK() {
    try {
      const apiKey = this.environment === 'mainnet' 
        ? import.meta.env.VITE_TATUM_API_KEY_MAINNET 
        : import.meta.env.VITE_TATUM_API_KEY_TESTNET;

      if (!apiKey) {
        console.warn('Tatum API key not found - running in testnet mode');
        this.initialized = false;
        return;
      }

      // Initialize Solana SDK
      this.solanaSDK = await TatumSDK.init({
        network: this.environment === 'mainnet' ? Network.SOLANA : Network.SOLANA_DEVNET,
        apiKey: apiKey,
        verbose: false
      });

      // Initialize Ethereum SDK for NFT operations
      this.ethereumSDK = await TatumSDK.init({
        network: this.environment === 'mainnet' ? Network.ETHEREUM : Network.ETHEREUM_SEPOLIA,
        apiKey: apiKey,
        verbose: false
      });

      this.initialized = true;
      console.log('Tatum SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tatum SDK:', error);
      throw error;
    }
  }

  private ensureInitialized() {
    if (!this.initialized || !this.solanaSDK) {
      console.warn('Tatum SDK not initialized - using testnet mode');
      return false;
    }
    return true;
  }

  // ============= WALLET OPERATIONS =============

  async createSolanaWallet(): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
    network: string;
  }> {
    if (!this.ensureInitialized()) {
      // Return testnet wallet for development
      return {
        address: 'testnetSolanaAddress' + Math.random().toString(36).substr(2, 9),
        privateKey: 'testnet-private-key-' + Math.random().toString(36).substr(2, 9),
        mnemonic: 'testnet mnemonic phrase for development testing only',
        network: 'solana-devnet'
      };
    }
    
    try {
      // Use the correct Tatum API method for wallet generation
      const wallet = await this.solanaSDK!.wallets.generateWallet();
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        network: this.environment === 'mainnet' ? 'solana-mainnet' : 'solana-devnet'
      };
    } catch (error) {
      console.error('Error creating Solana wallet:', error);
      // Return testnet wallet if API fails
      return {
        address: 'testnetSolanaAddress' + Math.random().toString(36).substr(2, 9),
        privateKey: 'testnet-private-key-' + Math.random().toString(36).substr(2, 9),
        mnemonic: 'testnet mnemonic phrase for development testing only',
        network: 'solana-devnet'
      };
    }
  }

  async createEthereumWallet(): Promise<{
    address: string;
    privateKey: string;
    mnemonic: string;
    network: string;
  }> {
    if (!this.ensureInitialized()) {
      // Return testnet wallet for development
      return {
        address: '0xtestnetEthereumAddress' + Math.random().toString(36).substr(2, 9),
        privateKey: 'testnet-private-key-' + Math.random().toString(36).substr(2, 9),
        mnemonic: 'testnet mnemonic phrase for development testing only',
        network: 'ethereum-sepolia'
      };
    }
    
    try {
      const wallet = await this.ethereumSDK!.wallets.generateWallet();
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        network: this.environment === 'mainnet' ? 'ethereum-mainnet' : 'ethereum-sepolia'
      };
    } catch (error) {
      console.error('Error creating Ethereum wallet:', error);
      // Return testnet wallet if API fails
      return {
        address: '0xtestnetEthereumAddress' + Math.random().toString(36).substr(2, 9),
        privateKey: 'testnet-private-key-' + Math.random().toString(36).substr(2, 9),
        mnemonic: 'testnet mnemonic phrase for development testing only',
        network: 'ethereum-sepolia'
      };
    }
  }

  async getSolanaBalance(address: string): Promise<number> {
    if (!this.ensureInitialized()) {
      // Return testnet balance
      return Math.random() * 10; // Random balance between 0-10 SOL
    }
    
    try {
      const balance = await this.solanaSDK!.address.getBalance({
        addresses: [address]
      });
      
      return balance.data?.[0]?.balance ? parseFloat(balance.data[0].balance) : 0;
    } catch (error) {
      console.error('Error getting Solana balance:', error);
      return 0;
    }
  }

  async getEthereumBalance(address: string): Promise<number> {
    this.ensureInitialized();
    
    try {
      const balance = await this.ethereumSDK!.address.getBalance({
        addresses: [address]
      });
      
      return balance.data?.[0]?.balance ? parseFloat(balance.data[0].balance) : 0;
    } catch (error) {
      console.error('Error getting Ethereum balance:', error);
      return 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getWalletTransactions(address: string, network: 'solana' | 'ethereum' = 'solana'): Promise<any[]> {
    this.ensureInitialized();
    
    try {
      const sdk = network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      const transactions = await sdk!.address.getTransactions({
        address,
        pageSize: 10
      });
      
      return transactions.data || [];
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return [];
    }
  }

  // ============= NFT OPERATIONS =============

  async createNFTCollection(params: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    walletPrivateKey: string;
    network: 'solana' | 'ethereum';
  }): Promise<string> {
    this.ensureInitialized();
    
    try {
      const sdk = params.network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      
      if (params.network === 'solana') {
        // Create Solana NFT Collection
        const collection = await sdk!.nft.createCollection({
          name: params.name,
          symbol: params.symbol,
          description: params.description,
          image: params.image,
          fromPrivateKey: params.walletPrivateKey
        });
        
        return collection.txId;
      } else {
        // Create Ethereum NFT Collection (ERC-721)
        const collection = await sdk!.nft.createNftCollection({
          name: params.name,
          symbol: params.symbol,
          fromPrivateKey: params.walletPrivateKey
        });
        
        return collection.txId;
      }
    } catch (error) {
      console.error('Error creating NFT collection:', error);
      throw error;
    }
  }

  async mintNFT(params: {
    collectionAddress?: string;
    name: string;
    description: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string }>;
    walletPrivateKey: string;
    recipientAddress: string;
    network: 'solana' | 'ethereum';
  }): Promise<{
    txId: string;
    tokenId?: string;
    mintAddress?: string;
  }> {
    this.ensureInitialized();
    
    try {
      const sdk = params.network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      
      if (params.network === 'solana') {
        // Mint Solana NFT
        const result = await sdk!.nft.mintNft({
          name: params.name,
          description: params.description,
          image: params.image,
          attributes: params.attributes || [],
          fromPrivateKey: params.walletPrivateKey,
          to: params.recipientAddress
        });
        
        return {
          txId: result.txId,
          mintAddress: result.nftAddress
        };
      } else {
        // Mint Ethereum NFT
        const metadata = JSON.stringify({
          name: params.name,
          description: params.description,
          image: params.image,
          attributes: params.attributes || []
        });
        
        const result = await sdk!.nft.mintNft({
          contractAddress: params.collectionAddress!,
          fromPrivateKey: params.walletPrivateKey,
          to: params.recipientAddress,
          tokenId: Date.now().toString(),
          url: `data:application/json;base64,${Buffer.from(metadata).toString('base64')}`
        });
        
        return {
          txId: result.txId,
          tokenId: Date.now().toString()
        };
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getNFTsByWallet(address: string, network: 'solana' | 'ethereum' = 'solana'): Promise<any[]> {
    if (!this.ensureInitialized()) {
      // Return testnet NFTs
      return [
        {
          id: 'testnet-nft-1',
          name: 'testnet NFT #1',
          description: 'A testnet NFT for development',
          image: 'https://via.placeholder.com/300x300?text=testnet+NFT+1',
          attributes: [{ trait_type: 'testnet', value: 'True' }],
          network: network
        },
        {
          id: 'testnet-nft-2',
          name: 'testnet NFT #2',
          description: 'Another testnet NFT',
          image: 'https://via.placeholder.com/300x300?text=testnet+NFT+2',
          attributes: [{ trait_type: 'testnet', value: 'True' }],
          network: network
        }
      ];
    }
    
    try {
      const sdk = network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      
      const nfts = await sdk!.nft.getNftsByAddress({
        addresses: [address],
        pageSize: 50
      });
      
      return nfts.data || [];
    } catch (error) {
      console.error('Error getting NFTs by wallet:', error);
      return [];
    }
  }

  async transferNFT(params: {
    nftAddress: string;
    fromPrivateKey: string;
    toAddress: string;
    network: 'solana' | 'ethereum';
  }): Promise<string> {
    this.ensureInitialized();
    
    try {
      const sdk = params.network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      
      const result = await sdk!.nft.transferNft({
        contractAddress: params.nftAddress,
        fromPrivateKey: params.fromPrivateKey,
        to: params.toAddress,
        tokenId: '1' // For Solana, this is typically 1
      });
      
      return result.txId;
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }

  // ============= UTILITY METHODS =============

  async validateAddress(address: string, network: 'solana' | 'ethereum' = 'solana'): Promise<boolean> {
    try {
      if (network === 'solana') {
        // Basic Solana address validation
        return address.length >= 32 && address.length <= 44;
      } else {
        // Basic Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      }
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    }
  }

  async getGasFee(network: 'solana' | 'ethereum' = 'solana'): Promise<number> {
    this.ensureInitialized();
    
    try {
      const sdk = network === 'solana' ? this.solanaSDK : this.ethereumSDK;
      
      // Get estimated gas fee
      const gasPrice = await sdk!.fee.getGasPrice();
      return gasPrice.data?.gasPrice || 0;
    } catch (error) {
      console.error('Error getting gas fee:', error);
      return 0;
    }
  }

  // ============= CONFIGURATION =============

  getEnvironment(): 'testnet' | 'mainnet' {
    return this.environment;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async destroy() {
    try {
      if (this.solanaSDK) {
        await this.solanaSDK.destroy();
      }
      if (this.ethereumSDK) {
        await this.ethereumSDK.destroy();
      }
      this.initialized = false;
    } catch (error) {
      console.error('Error destroying Tatum SDK:', error);
    }
  }
}

export const tatumService = new TatumService(); 