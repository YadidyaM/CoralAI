import { supabase } from '../lib/supabase';
import { openaiService } from './openaiService';

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

class TransactionTracker {
  private transactions: Transaction[] = [];
  private pnlData: Record<string, PnLData> = {};
  private snapshots: PortfolioSnapshot[] = [];
  private isInitialized = false;

  async initialize(userId: string) {
    if (this.isInitialized) return;
    
    try {
      // Load transactions from database
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: true });

      if (txError) throw txError;

      this.transactions = transactions || [];
      
      // Load portfolio snapshots
      const { data: snapshots, error: snapError } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (snapError) throw snapError;

      this.snapshots = snapshots || [];

      // Calculate current P&L
      await this.calculatePnL();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize transaction tracker:', error);
      throw error;
    }
  }

  async recordTransaction(transaction: Omit<Transaction, 'id'>) {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      // Save to database
      const { error } = await supabase
        .from('transactions')
        .insert([newTransaction]);

      if (error) throw error;

      // Add to local cache
      this.transactions.push(newTransaction);
      
      // Recalculate P&L
      await this.calculatePnL();
      
      // Create portfolio snapshot
      await this.createPortfolioSnapshot(transaction.userId);

      return newTransaction;
    } catch (error) {
      console.error('Failed to record transaction:', error);
      throw error;
    }
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

    // Process all transactions
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
          
          // Handle as sell of from token and buy of to token
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

    // Get current prices and calculate P&L
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
    // Mock price data - in real implementation, fetch from price APIs
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

    return Object.fromEntries(
      assets.map(asset => [asset, prices[asset] || 1])
    );
  }

  async createPortfolioSnapshot(userId: string) {
    const totalValue = Object.values(this.pnlData).reduce((sum, data) => sum + data.currentValue, 0);
    const totalInvested = Object.values(this.pnlData).reduce((sum, data) => sum + data.totalInvested, 0);
    const totalPnL = Object.values(this.pnlData).reduce((sum, data) => sum + data.totalPnL, 0);

    const snapshot: PortfolioSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: Date.now(),
      totalValue,
      totalInvested,
      totalPnL,
      pnlPercentage: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      assetBreakdown: { ...this.pnlData },
    };

    try {
      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert([snapshot]);

      if (error) throw error;

      this.snapshots.unshift(snapshot);
      
      // Keep only last 100 snapshots in memory
      if (this.snapshots.length > 100) {
        this.snapshots = this.snapshots.slice(0, 100);
      }

      return snapshot;
    } catch (error) {
      console.error('Failed to create portfolio snapshot:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, limit: number = 100): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  async getPortfolioHistory(userId: string, days: number = 30): Promise<PortfolioSnapshot[]> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('userId', userId)
        .gte('timestamp', cutoffTime)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get portfolio history:', error);
      throw error;
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
    
    const prompt = `Analyze this portfolio P&L data and provide insights:

Portfolio Summary:
- Total Value: $${summary.totalValue.toFixed(2)}
- Total Invested: $${summary.totalInvested.toFixed(2)}
- Total P&L: $${summary.totalPnL.toFixed(2)} (${summary.pnlPercentage.toFixed(2)}%)
- Realized P&L: $${summary.realizedPnL.toFixed(2)}
- Unrealized P&L: $${summary.unrealizedPnL.toFixed(2)}

Top Performer: ${summary.topPerformer?.asset} (${summary.topPerformer?.pnlPercentage.toFixed(2)}%)
Worst Performer: ${summary.worstPerformer?.asset} (${summary.worstPerformer?.pnlPercentage.toFixed(2)}%)

Recent Transactions:
${recentTransactions.map(tx => `${tx.type}: ${tx.fromAmount} ${tx.fromToken} → ${tx.toAmount} ${tx.toToken}`).join('\n')}

Asset Breakdown:
${Object.values(this.pnlData).map(data => 
  `${data.asset}: $${data.currentValue.toFixed(2)} (${data.pnlPercentage.toFixed(2)}%)`
).join('\n')}

Provide:
1. Performance analysis and key observations
2. Risk assessment based on concentration and volatility
3. Suggestions for portfolio optimization
4. Trading pattern insights
5. Recommendations for improving returns`;

    try {
      const insights = await openaiService.generateCompletion(prompt);
      return insights;
    } catch (error) {
      console.error('Failed to generate P&L insights:', error);
      return 'Unable to generate insights at this time.';
    }
  }
}

export const transactionTracker = new TransactionTracker(); 