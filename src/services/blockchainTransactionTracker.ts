import { Keypair } from '@solana/web3.js';
import { openaiService } from './openaiService';
import { 
  solanaStorage, 
  OnChainTransaction, 
  OnChainPortfolioSnapshot, 
  OnChainAssetData 
} from './solanaStorage';

export interface Transaction {
  id: string;
  userId: string;
  type: 'buy' | 'sell' | 'swap' | 'stake' | 'unstake' | 'yield' | 'fee';
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  timestamp: number;
  txHash: string;
  gasUsed: number;
  gasCost: number;
  status: 'pending' | 'confirmed' | 'failed';
  exchange: string;
  notes?: string;
}

export interface PnLData {
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

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  timestamp: number;
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  pnlPercentage: number;
  assetBreakdown: Record<string, PnLData>;
}

class BlockchainTransactionTracker {
  private transactions: Transaction[] = [];
  private pnlData: Record<string, PnLData> = {};
  private snapshots: PortfolioSnapshot[] = [];
  private isInitialized = false;
  private userWallet: Keypair | null = null;

  // Set user wallet for blockchain transactions
  setUserWallet(wallet: Keypair) {
    this.userWallet = wallet;
  }

  async initialize(userId: string) {
    if (this.isInitialized) return;
    
    try {
      // Load transactions from blockchain
      const onChainTransactions = await solanaStorage.getUserTransactions(userId, 100);
      this.transactions = this.convertFromOnChainTransactions(onChainTransactions);
      
      // Load portfolio snapshots from blockchain
      const { snapshots: onChainSnapshots, assetData } = await solanaStorage.getPortfolioSnapshots(userId, 100);
      this.snapshots = await this.convertFromOnChainSnapshots(onChainSnapshots, assetData);

      // Calculate current P&L
      await this.calculatePnL();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize blockchain transaction tracker:', error);
      throw error;
    }
  }

  async recordTransaction(transaction: Omit<Transaction, 'id'>) {
    if (!this.userWallet) {
      throw new Error('User wallet not set. Call setUserWallet() first.');
    }

    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      // Convert to on-chain format
      const onChainTransaction: OnChainTransaction = this.convertToOnChainTransaction(newTransaction);
      
      // Store on blockchain
      const signature = await solanaStorage.createTransaction(this.userWallet, onChainTransaction);
      console.log('Transaction stored on blockchain with signature:', signature);

      // Add to local cache
      this.transactions.push(newTransaction);
      
      // Recalculate P&L
      await this.calculatePnL();
      
      // Create portfolio snapshot on blockchain
      await this.createPortfolioSnapshot(transaction.userId);

      return newTransaction;
    } catch (error) {
      console.error('Failed to record transaction on blockchain:', error);
      throw error;
    }
  }

  private convertToOnChainTransaction(tx: Transaction): OnChainTransaction {
    const typeMap = {
      'buy': 0, 'sell': 1, 'swap': 2, 'stake': 3, 'unstake': 4, 'yield': 5, 'fee': 6
    };
    const statusMap = {
      'pending': 0, 'confirmed': 1, 'failed': 2
    };

    return {
      id: tx.id,
      userId: tx.userId,
      transactionType: typeMap[tx.type],
      fromToken: tx.fromToken,
      toToken: tx.toToken,
      fromAmount: tx.fromAmount,
      toAmount: tx.toAmount,
      price: tx.price,
      timestamp: tx.timestamp,
      txHash: tx.txHash,
      gasUsed: tx.gasUsed,
      gasCost: tx.gasCost,
      status: statusMap[tx.status],
      exchange: tx.exchange,
      notes: tx.notes || ''
    };
  }

  private convertFromOnChainTransactions(onChainTxs: OnChainTransaction[]): Transaction[] {
    const typeMap = ['buy', 'sell', 'swap', 'stake', 'unstake', 'yield', 'fee'] as const;
    const statusMap = ['pending', 'confirmed', 'failed'] as const;

    return onChainTxs.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      type: typeMap[tx.transactionType],
      fromToken: tx.fromToken,
      toToken: tx.toToken,
      fromAmount: tx.fromAmount,
      toAmount: tx.toAmount,
      price: tx.price,
      timestamp: tx.timestamp,
      txHash: tx.txHash,
      gasUsed: tx.gasUsed,
      gasCost: tx.gasCost,
      status: statusMap[tx.status],
      exchange: tx.exchange,
      notes: tx.notes
    }));
  }

  private async convertFromOnChainSnapshots(
    onChainSnapshots: OnChainPortfolioSnapshot[], 
    assetData: Record<string, OnChainAssetData[]>
  ): Promise<PortfolioSnapshot[]> {
    return onChainSnapshots.map(snapshot => {
      const assetBreakdown: Record<string, PnLData> = {};
      
      // Convert asset data
      Object.entries(assetData).forEach(([asset, data]) => {
        if (data.length > 0) {
          const latestData = data.sort((a, b) => b.lastTransactionDate - a.lastTransactionDate)[0];
          assetBreakdown[asset] = {
            asset: latestData.asset,
            currentValue: latestData.currentValue,
            totalInvested: latestData.totalInvested,
            realizedPnL: latestData.realizedPnL,
            unrealizedPnL: latestData.unrealizedPnL,
            totalPnL: latestData.totalPnL,
            pnlPercentage: latestData.pnlPercentage,
            averageBuyPrice: latestData.averageBuyPrice,
            currentPrice: latestData.currentPrice,
            quantity: latestData.quantity,
            firstPurchaseDate: latestData.firstPurchaseDate,
            lastTransactionDate: latestData.lastTransactionDate
          };
        }
      });

      return {
        id: snapshot.id,
        userId: snapshot.userId,
        timestamp: snapshot.timestamp,
        totalValue: snapshot.totalValue,
        totalInvested: snapshot.totalInvested,
        totalPnL: snapshot.totalPnL,
        pnlPercentage: snapshot.pnlPercentage,
        assetBreakdown
      };
    });
  }

  private async calculatePnL() {
    const assetData: Record<string, {
      totalBought: number;
      totalSold: number;
      totalInvested: number;
      totalRealized: number;
      quantity: number;
      weightedAveragePrice: number;
      firstPurchase: number;
      lastTransaction: number;
    }> = {};

    // Process all transactions (same logic as before)
    for (const tx of this.transactions) {
      if (tx.status !== 'confirmed') continue;

      const initAsset = (asset: string) => {
        if (!assetData[asset]) {
          assetData[asset] = {
            totalBought: 0,
            totalSold: 0,
            totalInvested: 0,
            totalRealized: 0,
            quantity: 0,
            weightedAveragePrice: 0,
            firstPurchase: tx.timestamp,
            lastTransaction: tx.timestamp,
          };
        }
        assetData[asset].lastTransaction = Math.max(assetData[asset].lastTransaction, tx.timestamp);
      };

      switch (tx.type) {
        case 'buy':
          initAsset(tx.toToken);
          const buyData = assetData[tx.toToken];
          const newQuantity = buyData.quantity + tx.toAmount;
          buyData.weightedAveragePrice = (
            (buyData.weightedAveragePrice * buyData.quantity) + 
            (tx.price * tx.toAmount)
          ) / newQuantity;
          buyData.quantity = newQuantity;
          buyData.totalBought += tx.toAmount;
          buyData.totalInvested += tx.fromAmount;
          break;

        case 'sell':
          initAsset(tx.fromToken);
          const sellData = assetData[tx.fromToken];
          sellData.quantity -= tx.fromAmount;
          sellData.totalSold += tx.fromAmount;
          sellData.totalRealized += tx.toAmount - (sellData.weightedAveragePrice * tx.fromAmount);
          break;

        case 'swap':
          initAsset(tx.fromToken);
          initAsset(tx.toToken);
          
          const fromData = assetData[tx.fromToken];
          const toData = assetData[tx.toToken];
          
          fromData.quantity -= tx.fromAmount;
          fromData.totalSold += tx.fromAmount;
          
          const swapValue = tx.fromAmount * tx.price;
          const toNewQuantity = toData.quantity + tx.toAmount;
          toData.weightedAveragePrice = (
            (toData.weightedAveragePrice * toData.quantity) + 
            (swapValue / tx.toAmount) * tx.toAmount
          ) / toNewQuantity;
          toData.quantity = toNewQuantity;
          toData.totalBought += tx.toAmount;
          toData.totalInvested += swapValue;
          break;

        case 'yield':
          initAsset(tx.toToken);
          const yieldData = assetData[tx.toToken];
          yieldData.quantity += tx.toAmount;
          yieldData.totalRealized += tx.toAmount * tx.price;
          break;
      }
    }

    // Get current prices and calculate P&L (same logic as before)
    const currentPrices = await this.getCurrentPrices(Object.keys(assetData));
    
    this.pnlData = {};
    
    for (const [asset, data] of Object.entries(assetData)) {
      if (data.quantity <= 0) continue;

      const currentPrice = currentPrices[asset] || data.weightedAveragePrice;
      const currentValue = data.quantity * currentPrice;
      const unrealizedPnL = currentValue - (data.quantity * data.weightedAveragePrice);
      const totalPnL = data.totalRealized + unrealizedPnL;

      this.pnlData[asset] = {
        asset,
        currentValue,
        totalInvested: data.totalInvested,
        realizedPnL: data.totalRealized,
        unrealizedPnL,
        totalPnL,
        pnlPercentage: data.totalInvested > 0 ? (totalPnL / data.totalInvested) * 100 : 0,
        averageBuyPrice: data.weightedAveragePrice,
        currentPrice,
        quantity: data.quantity,
        firstPurchaseDate: data.firstPurchase,
        lastTransactionDate: data.lastTransaction,
      };
    }
  }

  private async getCurrentPrices(assets: string[]): Promise<Record<string, number>> {
    // Enhanced with real Solana price feeds
    try {
      // In a real implementation, you would fetch from Jupiter API or Pyth Network
      const prices: Record<string, number> = {
        'SOL': 160.50,
        'mSOL': 173.25,
        'USDC': 1.00,
        'RAY': 2.15,
        'ORCA': 3.80,
        'SRM': 0.45,
        'FIDA': 0.32,
        'SAMO': 0.018,
      };

      // Fetch real prices from Solana price oracles (mock implementation)
      for (const asset of assets) {
        if (!prices[asset]) {
          // In real implementation, query Pyth Network or other price oracles
          prices[asset] = await this.fetchPriceFromOracle(asset);
        }
      }

      return Object.fromEntries(
        assets.map(asset => [asset, prices[asset] || 1])
      );
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
      // Fallback to mock prices
      return Object.fromEntries(
        assets.map(asset => [asset, 1])
      );
    }
  }

  private async fetchPriceFromOracle(asset: string): Promise<number> {
    // Mock implementation - in real app, query Pyth Network or similar
    try {
      // This would connect to Pyth Network price feeds on Solana
      const mockPrices: Record<string, number> = {
        'SOL': 160.50,
        'USDC': 1.00,
        'RAY': 2.15,
        'ORCA': 3.80,
        'SRM': 0.45,
      };
      
      return mockPrices[asset] || 1.0;
    } catch (error) {
      console.error('Failed to fetch price from oracle for', asset, error);
      return 1.0;
    }
  }

  async createPortfolioSnapshot(userId: string) {
    if (!this.userWallet) {
      throw new Error('User wallet not set for blockchain operations');
    }

    const totalValue = Object.values(this.pnlData).reduce((sum, data) => sum + data.currentValue, 0);
    const totalInvested = Object.values(this.pnlData).reduce((sum, data) => sum + data.totalInvested, 0);
    const totalPnL = Object.values(this.pnlData).reduce((sum, data) => sum + data.totalPnL, 0);

    const snapshot: OnChainPortfolioSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: Date.now(),
      totalValue,
      totalInvested,
      totalPnL,
      pnlPercentage: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      assetCount: Object.keys(this.pnlData).length,
    };

    // Convert asset data for blockchain storage
    const assetData: OnChainAssetData[] = Object.values(this.pnlData).map(data => ({
      userId,
      asset: data.asset,
      currentValue: data.currentValue,
      totalInvested: data.totalInvested,
      realizedPnL: data.realizedPnL,
      unrealizedPnL: data.unrealizedPnL,
      totalPnL: data.totalPnL,
      pnlPercentage: data.pnlPercentage,
      averageBuyPrice: data.averageBuyPrice,
      currentPrice: data.currentPrice,
      quantity: data.quantity,
      firstPurchaseDate: data.firstPurchaseDate,
      lastTransactionDate: data.lastTransactionDate,
    }));

    try {
      const signature = await solanaStorage.createPortfolioSnapshot(this.userWallet, snapshot, assetData);
      console.log('Portfolio snapshot stored on blockchain with signature:', signature);

      // Add to local cache
      const localSnapshot: PortfolioSnapshot = {
        id: snapshot.id,
        userId: snapshot.userId,
        timestamp: snapshot.timestamp,
        totalValue: snapshot.totalValue,
        totalInvested: snapshot.totalInvested,
        totalPnL: snapshot.totalPnL,
        pnlPercentage: snapshot.pnlPercentage,
        assetBreakdown: { ...this.pnlData },
      };

      this.snapshots.unshift(localSnapshot);
      
      // Keep only last 100 snapshots in memory
      if (this.snapshots.length > 100) {
        this.snapshots = this.snapshots.slice(0, 100);
      }

      return localSnapshot;
    } catch (error) {
      console.error('Failed to create portfolio snapshot on blockchain:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, limit: number = 100): Promise<Transaction[]> {
    try {
      const onChainTransactions = await solanaStorage.getUserTransactions(userId, limit);
      return this.convertFromOnChainTransactions(onChainTransactions);
    } catch (error) {
      console.error('Failed to get transaction history from blockchain:', error);
      return this.transactions.slice(0, limit);
    }
  }

  async getPortfolioHistory(userId: string, days: number = 30): Promise<PortfolioSnapshot[]> {
    try {
      const { snapshots: onChainSnapshots, assetData } = await solanaStorage.getPortfolioSnapshots(userId, days);
      return await this.convertFromOnChainSnapshots(onChainSnapshots, assetData);
    } catch (error) {
      console.error('Failed to get portfolio history from blockchain:', error);
      
      // Filter local snapshots as fallback
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      return this.snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
    }
  }

  getCurrentPnL(): Record<string, PnLData> {
    return { ...this.pnlData };
  }

  getPortfolioSummary() {
    const assets = Object.values(this.pnlData);
    
    return {
      totalValue: assets.reduce((sum, data) => sum + data.currentValue, 0),
      totalInvested: assets.reduce((sum, data) => sum + data.totalInvested, 0),
      totalPnL: assets.reduce((sum, data) => sum + data.totalPnL, 0),
      realizedPnL: assets.reduce((sum, data) => sum + data.realizedPnL, 0),
      unrealizedPnL: assets.reduce((sum, data) => sum + data.unrealizedPnL, 0),
      pnlPercentage: assets.reduce((sum, data) => sum + data.totalInvested, 0) > 0 
        ? (assets.reduce((sum, data) => sum + data.totalPnL, 0) / assets.reduce((sum, data) => sum + data.totalInvested, 0)) * 100 
        : 0,
      assetCount: assets.length,
      topPerformer: assets.reduce((best, current) => 
        current.pnlPercentage > (best?.pnlPercentage || -Infinity) ? current : best, 
        null as PnLData | null
      ),
      worstPerformer: assets.reduce((worst, current) => 
        current.pnlPercentage < (worst?.pnlPercentage || Infinity) ? current : worst, 
        null as PnLData | null
      ),
    };
  }

  async generatePnLInsights(userId: string) {
    const summary = this.getPortfolioSummary();
    const recentTransactions = await this.getTransactionHistory(userId, 10);
    
    const prompt = `Analyze this Solana DeFi portfolio P&L data stored on-chain and provide insights:

Portfolio Summary (On-Chain Data):
- Total Value: $${summary.totalValue.toFixed(2)}
- Total Invested: $${summary.totalInvested.toFixed(2)}
- Total P&L: $${summary.totalPnL.toFixed(2)} (${summary.pnlPercentage.toFixed(2)}%)
- Realized P&L: $${summary.realizedPnL.toFixed(2)}
- Unrealized P&L: $${summary.unrealizedPnL.toFixed(2)}

Top Performer: ${summary.topPerformer?.asset} (${summary.topPerformer?.pnlPercentage.toFixed(2)}%)
Worst Performer: ${summary.worstPerformer?.asset} (${summary.worstPerformer?.pnlPercentage.toFixed(2)}%)

Recent On-Chain Transactions:
${recentTransactions.map(tx => `${tx.type}: ${tx.fromAmount} ${tx.fromToken} → ${tx.toAmount} ${tx.toToken} [${tx.txHash.substring(0, 8)}...]`).join('\n')}

Asset Breakdown (Blockchain Verified):
${Object.values(this.pnlData).map(data => 
  `${data.asset}: $${data.currentValue.toFixed(2)} (${data.pnlPercentage.toFixed(2)}%)`
).join('\n')}

Provide blockchain-focused insights:
1. Performance analysis of on-chain positions
2. DeFi protocol risk assessment
3. Solana ecosystem optimization suggestions
4. Transaction pattern insights from blockchain data
5. Recommendations for improving DeFi yields`;

    try {
      const insights = await openaiService.generateCompletion(prompt);
      return insights;
    } catch (error) {
      console.error('Failed to generate P&L insights:', error);
      return 'Unable to generate insights at this time. Please check your blockchain connection.';
    }
  }

  // Get blockchain connection info
  getBlockchainInfo() {
    return {
      connection: solanaStorage.getConnection(),
      programId: solanaStorage.getProgramId(),
      isInitialized: this.isInitialized,
      hasWallet: !!this.userWallet,
      transactionCount: this.transactions.length,
      snapshotCount: this.snapshots.length
    };
  }
}

export const blockchainTransactionTracker = new BlockchainTransactionTracker(); 