import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as borsh from 'borsh';

// Program ID for our portfolio management program (would be deployed)
export const PORTFOLIO_PROGRAM_ID = new PublicKey('PortfoLio1111111111111111111111111111111111');

// Account data structures for on-chain storage
export interface OnChainTransaction {
  id: string;
  userId: string;
  transactionType: number; // 0=buy, 1=sell, 2=swap, 3=stake, 4=unstake, 5=yield, 6=fee
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  timestamp: number;
  txHash: string;
  gasUsed: number;
  gasCost: number;
  status: number; // 0=pending, 1=confirmed, 2=failed
  exchange: string;
  notes: string;
}

export interface OnChainPortfolioSnapshot {
  id: string;
  userId: string;
  timestamp: number;
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  pnlPercentage: number;
  assetCount: number;
  // Asset breakdown stored as separate accounts due to size limits
}

export interface OnChainAssetData {
  userId: string;
  asset: string;
  currentValue: number;
  totalInvested: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  pnlPercentage: number;
  averageBuyPrice: number;
  currentPrice: number;
  quantity: number;
  firstPurchaseDate: number;
  lastTransactionDate: number;
}

export interface OnChainPerformanceMetrics {
  userId: string;
  timeFrame: number;
  calculatedAt: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  beta: number;
  alpha: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
}

export interface OnChainAIInsights {
  userId: string;
  timeFrame: number;
  generatedAt: number;
  summary: string;
  overallScore: number;
  // Recommendations stored as separate accounts due to size limits
}

// Instruction types for the Solana program
export enum ProgramInstruction {
  CreateTransaction = 0,
  UpdateTransaction = 1,
  CreatePortfolioSnapshot = 2,
  UpdateAssetData = 3,
  CreatePerformanceMetrics = 4,
  CreateAIInsights = 5,
  CreateRecommendation = 6,
}

// Borsh schemas for serialization
export const TransactionSchema = new Map([
  [OnChainTransaction, {
    kind: 'struct',
    fields: [
      ['id', 'string'],
      ['userId', 'string'],
      ['transactionType', 'u8'],
      ['fromToken', 'string'],
      ['toToken', 'string'],
      ['fromAmount', 'f64'],
      ['toAmount', 'f64'],
      ['price', 'f64'],
      ['timestamp', 'u64'],
      ['txHash', 'string'],
      ['gasUsed', 'f64'],
      ['gasCost', 'f64'],
      ['status', 'u8'],
      ['exchange', 'string'],
      ['notes', 'string'],
    ]
  }]
]);

export const PortfolioSnapshotSchema = new Map([
  [OnChainPortfolioSnapshot, {
    kind: 'struct',
    fields: [
      ['id', 'string'],
      ['userId', 'string'],
      ['timestamp', 'u64'],
      ['totalValue', 'f64'],
      ['totalInvested', 'f64'],
      ['totalPnL', 'f64'],
      ['pnlPercentage', 'f64'],
      ['assetCount', 'u32'],
    ]
  }]
]);

export const AssetDataSchema = new Map([
  [OnChainAssetData, {
    kind: 'struct',
    fields: [
      ['userId', 'string'],
      ['asset', 'string'],
      ['currentValue', 'f64'],
      ['totalInvested', 'f64'],
      ['realizedPnL', 'f64'],
      ['unrealizedPnL', 'f64'],
      ['totalPnL', 'f64'],
      ['pnlPercentage', 'f64'],
      ['averageBuyPrice', 'f64'],
      ['currentPrice', 'f64'],
      ['quantity', 'f64'],
      ['firstPurchaseDate', 'u64'],
      ['lastTransactionDate', 'u64'],
    ]
  }]
]);

export const PerformanceMetricsSchema = new Map([
  [OnChainPerformanceMetrics, {
    kind: 'struct',
    fields: [
      ['userId', 'string'],
      ['timeFrame', 'u32'],
      ['calculatedAt', 'u64'],
      ['totalReturn', 'f64'],
      ['annualizedReturn', 'f64'],
      ['volatility', 'f64'],
      ['sharpeRatio', 'f64'],
      ['maxDrawdown', 'f64'],
      ['winRate', 'f64'],
      ['beta', 'f64'],
      ['alpha', 'f64'],
      ['valueAtRisk95', 'f64'],
      ['valueAtRisk99', 'f64'],
    ]
  }]
]);

class SolanaStorageService {
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpcUrl: string = 'https://api.devnet.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = PORTFOLIO_PROGRAM_ID;
  }

  // Helper function to derive PDA (Program Derived Address)
  async findProgramAddress(seeds: (Buffer | Uint8Array)[]): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(seeds, this.programId);
  }

  // Create transaction account on-chain
  async createTransaction(
    userWallet: Keypair,
    transactionData: OnChainTransaction
  ): Promise<string> {
    try {
      const transactionId = transactionData.id;
      const [transactionPDA] = await this.findProgramAddress([
        Buffer.from('transaction'),
        Buffer.from(transactionData.userId),
        Buffer.from(transactionId)
      ]);

      const serializedData = borsh.serialize(TransactionSchema, transactionData);
      
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: transactionPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data: Buffer.concat([
          Buffer.from([ProgramInstruction.CreateTransaction]),
          Buffer.from(serializedData)
        ])
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      return signature;
    } catch (error) {
      console.error('Failed to create transaction on-chain:', error);
      throw error;
    }
  }

  // Get transactions for a user
  async getUserTransactions(userId: string, limit: number = 100): Promise<OnChainTransaction[]> {
    try {
      // Get all transaction accounts for this user
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 0, // Start of userId field
              bytes: Buffer.from(userId).toString('base64')
            }
          }
        ]
      });

      const transactions: OnChainTransaction[] = [];
      
      for (const account of accounts) {
        try {
          const transaction = borsh.deserialize(
            TransactionSchema,
            OnChainTransaction,
            account.account.data
          );
          transactions.push(transaction);
        } catch (err) {
          console.warn('Failed to deserialize transaction:', err);
        }
      }

      // Sort by timestamp and limit
      return transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get user transactions:', error);
      return [];
    }
  }

  // Create portfolio snapshot on-chain
  async createPortfolioSnapshot(
    userWallet: Keypair,
    snapshotData: OnChainPortfolioSnapshot,
    assetData: OnChainAssetData[]
  ): Promise<string> {
    try {
      const [snapshotPDA] = await this.findProgramAddress([
        Buffer.from('portfolio'),
        Buffer.from(snapshotData.userId),
        Buffer.from(snapshotData.timestamp.toString())
      ]);

      const instructions: TransactionInstruction[] = [];

      // Create main snapshot account
      const serializedSnapshot = borsh.serialize(PortfolioSnapshotSchema, snapshotData);
      
      instructions.push(new TransactionInstruction({
        keys: [
          { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: snapshotPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data: Buffer.concat([
          Buffer.from([ProgramInstruction.CreatePortfolioSnapshot]),
          Buffer.from(serializedSnapshot)
        ])
      }));

      // Create asset data accounts
      for (const asset of assetData) {
        const [assetPDA] = await this.findProgramAddress([
          Buffer.from('asset'),
          Buffer.from(asset.userId),
          Buffer.from(asset.asset)
        ]);

        const serializedAsset = borsh.serialize(AssetDataSchema, asset);
        
        instructions.push(new TransactionInstruction({
          keys: [
            { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: assetPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          programId: this.programId,
          data: Buffer.concat([
            Buffer.from([ProgramInstruction.UpdateAssetData]),
            Buffer.from(serializedAsset)
          ])
        }));
      }

      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      return signature;
    } catch (error) {
      console.error('Failed to create portfolio snapshot:', error);
      throw error;
    }
  }

  // Get portfolio snapshots for a user
  async getPortfolioSnapshots(
    userId: string, 
    timeFrame: number = 30
  ): Promise<{snapshots: OnChainPortfolioSnapshot[], assetData: Record<string, OnChainAssetData[]>}> {
    try {
      const cutoffTime = Date.now() - (timeFrame * 24 * 60 * 60 * 1000);
      
      // Get snapshot accounts
      const snapshotAccounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 32, // Offset to userId field
              bytes: Buffer.from(userId).toString('base64')
            }
          }
        ]
      });

      const snapshots: OnChainPortfolioSnapshot[] = [];
      
      for (const account of snapshotAccounts) {
        try {
          const snapshot = borsh.deserialize(
            PortfolioSnapshotSchema,
            OnChainPortfolioSnapshot,
            account.account.data
          );
          
          if (snapshot.timestamp >= cutoffTime) {
            snapshots.push(snapshot);
          }
        } catch (err) {
          console.warn('Failed to deserialize snapshot:', err);
        }
      }

      // Get asset data
      const assetAccounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 0, // Start of userId field in asset data
              bytes: Buffer.from(userId).toString('base64')
            }
          }
        ]
      });

      const assetData: Record<string, OnChainAssetData[]> = {};
      
      for (const account of assetAccounts) {
        try {
          const asset = borsh.deserialize(
            AssetDataSchema,
            OnChainAssetData,
            account.account.data
          );
          
          if (!assetData[asset.asset]) {
            assetData[asset.asset] = [];
          }
          assetData[asset.asset].push(asset);
        } catch (err) {
          console.warn('Failed to deserialize asset data:', err);
        }
      }

      return {
        snapshots: snapshots.sort((a, b) => b.timestamp - a.timestamp),
        assetData
      };
    } catch (error) {
      console.error('Failed to get portfolio snapshots:', error);
      return { snapshots: [], assetData: {} };
    }
  }

  // Store performance metrics on-chain
  async storePerformanceMetrics(
    userWallet: Keypair,
    metricsData: OnChainPerformanceMetrics
  ): Promise<string> {
    try {
      const [metricsPDA] = await this.findProgramAddress([
        Buffer.from('metrics'),
        Buffer.from(metricsData.userId),
        Buffer.from(metricsData.timeFrame.toString())
      ]);

      const serializedData = borsh.serialize(PerformanceMetricsSchema, metricsData);
      
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: metricsPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data: Buffer.concat([
          Buffer.from([ProgramInstruction.CreatePerformanceMetrics]),
          Buffer.from(serializedData)
        ])
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      return signature;
    } catch (error) {
      console.error('Failed to store performance metrics:', error);
      throw error;
    }
  }

  // Get performance metrics from chain
  async getPerformanceMetrics(
    userId: string,
    timeFrame: number
  ): Promise<OnChainPerformanceMetrics | null> {
    try {
      const [metricsPDA] = await this.findProgramAddress([
        Buffer.from('metrics'),
        Buffer.from(userId),
        Buffer.from(timeFrame.toString())
      ]);

      const accountInfo = await this.connection.getAccountInfo(metricsPDA);
      
      if (!accountInfo) {
        return null;
      }

      const metrics = borsh.deserialize(
        PerformanceMetricsSchema,
        OnChainPerformanceMetrics,
        accountInfo.data
      );

      return metrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return null;
    }
  }

  // Store AI insights on-chain
  async storeAIInsights(
    userWallet: Keypair,
    insightsData: OnChainAIInsights,
    recommendations: string[]
  ): Promise<string> {
    try {
      const [insightsPDA] = await this.findProgramAddress([
        Buffer.from('insights'),
        Buffer.from(insightsData.userId),
        Buffer.from(insightsData.timeFrame.toString())
      ]);

      const instructions: TransactionInstruction[] = [];

      // Create main insights account (simplified due to size constraints)
      const basicInsights = {
        userId: insightsData.userId,
        timeFrame: insightsData.timeFrame,
        generatedAt: insightsData.generatedAt,
        summary: insightsData.summary.substring(0, 200), // Truncate for on-chain storage
        overallScore: insightsData.overallScore
      };

      const serializedInsights = Buffer.from(JSON.stringify(basicInsights));
      
      instructions.push(new TransactionInstruction({
        keys: [
          { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: insightsPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data: Buffer.concat([
          Buffer.from([ProgramInstruction.CreateAIInsights]),
          serializedInsights
        ])
      }));

      // Store recommendations as separate accounts
      for (let i = 0; i < Math.min(recommendations.length, 5); i++) {
        const [recPDA] = await this.findProgramAddress([
          Buffer.from('recommendation'),
          Buffer.from(insightsData.userId),
          Buffer.from(i.toString())
        ]);

        const recData = Buffer.from(recommendations[i].substring(0, 500)); // Truncate
        
        instructions.push(new TransactionInstruction({
          keys: [
            { pubkey: userWallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: recPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          ],
          programId: this.programId,
          data: Buffer.concat([
            Buffer.from([ProgramInstruction.CreateRecommendation]),
            recData
          ])
        }));
      }

      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      return signature;
    } catch (error) {
      console.error('Failed to store AI insights:', error);
      throw error;
    }
  }

  // Get user's current assets
  async getCurrentAssets(userId: string): Promise<OnChainAssetData[]> {
    try {
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: Buffer.from(userId).toString('base64')
            }
          }
        ]
      });

      const assets: OnChainAssetData[] = [];
      
      for (const account of accounts) {
        try {
          const asset = borsh.deserialize(
            AssetDataSchema,
            OnChainAssetData,
            account.account.data
          );
          assets.push(asset);
        } catch (err) {
          // Skip accounts that aren't asset data
          continue;
        }
      }

      return assets;
    } catch (error) {
      console.error('Failed to get current assets:', error);
      return [];
    }
  }

  // Get connection info
  getConnection(): Connection {
    return this.connection;
  }

  // Get program ID
  getProgramId(): PublicKey {
    return this.programId;
  }

  // Utility: Check if account exists
  async accountExists(publicKey: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return accountInfo !== null;
    } catch (error) {
      return false;
    }
  }

  // Utility: Get account balance
  async getAccountBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      return 0;
    }
  }
}

export const solanaStorage = new SolanaStorageService();
export default SolanaStorageService; 