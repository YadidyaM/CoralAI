import { Keypair } from '@solana/web3.js';
import { blockchainTransactionTracker, PortfolioSnapshot, PnLData } from './blockchainTransactionTracker';
import { solanaStorage, OnChainPerformanceMetrics } from './solanaStorage';
import { openaiService } from './openaiService';

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  calmarRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
}

export interface RiskMetrics {
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  conditionalVaR99: number;
  portfolioVolatility: number;
  concentrationRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  diversificationRatio: number;
  trackingError: number;
}

export interface BenchmarkComparison {
  benchmark: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  outperformance: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  trackingError: number;
  upCapture: number;
  downCapture: number;
}

export interface SolanaMarketIndex {
  symbol: string;
  name: string;
  returns: number[];
  timestamps: number[];
  currentPrice: number;
  historicalData: { price: number; timestamp: number }[];
  onChainOracle?: string; // Pyth Network or other Solana oracle address
}

class BlockchainPortfolioAnalytics {
  private solanaIndices: Record<string, SolanaMarketIndex> = {};
  private riskFreeRate = 0.05; // 5% annual risk-free rate
  private userWallet: Keypair | null = null;

  constructor() {
    this.initializeSolanaIndices();
  }

  setUserWallet(wallet: Keypair) {
    this.userWallet = wallet;
  }

  private initializeSolanaIndices() {
    // Initialize with Solana-specific market data
    this.solanaIndices = {
      'SOL': {
        symbol: 'SOL',
        name: 'Solana',
        returns: this.generateMockReturns(365, 0.15, 0.75), // Higher volatility for Solana
        timestamps: this.generateTimestamps(365),
        currentPrice: 160.50,
        historicalData: this.generateHistoricalData(365, 160.50, 0.75),
        onChainOracle: '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE' // Example Pyth SOL/USD oracle
      },
      'SOLANA_DEFI_INDEX': {
        symbol: 'SOLANA_DEFI_INDEX',
        name: 'Solana DeFi Index',
        returns: this.generateMockReturns(365, 0.25, 0.85), // Higher returns and volatility for DeFi
        timestamps: this.generateTimestamps(365),
        currentPrice: 100,
        historicalData: this.generateHistoricalData(365, 100, 0.85),
        onChainOracle: 'DefiIndex1111111111111111111111111111111111' // Mock DeFi index oracle
      },
      'SOLANA_ECOSYSTEM': {
        symbol: 'SOLANA_ECOSYSTEM',
        name: 'Solana Ecosystem Token Index',
        returns: this.generateMockReturns(365, 0.20, 0.80),
        timestamps: this.generateTimestamps(365),
        currentPrice: 100,
        historicalData: this.generateHistoricalData(365, 100, 0.80),
        onChainOracle: 'EcoIndex1111111111111111111111111111111111'
      },
      'BTC': {
        symbol: 'BTC',
        name: 'Bitcoin (Cross-chain reference)',
        returns: this.generateMockReturns(365, 0.12, 0.55),
        timestamps: this.generateTimestamps(365),
        currentPrice: 45000,
        historicalData: this.generateHistoricalData(365, 45000, 0.55),
        onChainOracle: '3gLJjjJaQJgZPZQdrhKDa1Cm6HbtP5fMYCGJ2YZaprFk' // Pyth BTC/USD oracle
      }
    };
  }

  private generateMockReturns(days: number, meanReturn: number, volatility: number): number[] {
    const returns = [];
    const dailyMean = meanReturn / 365;
    const dailyVol = volatility / Math.sqrt(365);
    
    for (let i = 0; i < days; i++) {
      const randomReturn = dailyMean + dailyVol * this.boxMullerTransform();
      returns.push(randomReturn);
    }
    
    return returns;
  }

  private generateTimestamps(days: number): number[] {
    const timestamps = [];
    const now = Date.now();
    
    for (let i = days - 1; i >= 0; i--) {
      timestamps.push(now - (i * 24 * 60 * 60 * 1000));
    }
    
    return timestamps;
  }

  private generateHistoricalData(days: number, startPrice: number, volatility: number): { price: number; timestamp: number }[] {
    const data = [];
    const returns = this.generateMockReturns(days, 0.15, volatility);
    let price = startPrice;
    
    for (let i = 0; i < days; i++) {
      price = price * (1 + returns[i]);
      data.push({
        price,
        timestamp: Date.now() - ((days - i) * 24 * 60 * 60 * 1000)
      });
    }
    
    return data;
  }

  private boxMullerTransform(): number {
    const u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  async calculatePerformanceMetrics(userId: string, days: number = 30): Promise<PerformanceMetrics> {
    try {
      // Try to get cached metrics from blockchain first
      const cachedMetrics = await solanaStorage.getPerformanceMetrics(userId, days);
      
      if (cachedMetrics && (Date.now() - cachedMetrics.calculatedAt) < 300000) { // 5 minute cache
        return this.convertFromOnChainMetrics(cachedMetrics);
      }

      // Calculate fresh metrics
      const snapshots = await blockchainTransactionTracker.getPortfolioHistory(userId, days);
      
      if (snapshots.length < 2) {
        throw new Error('Insufficient blockchain data for performance calculations');
      }

      const returns = this.calculateReturns(snapshots);
      const periodReturn = (snapshots[snapshots.length - 1].totalValue - snapshots[0].totalValue) / snapshots[0].totalValue;
      
      const annualizedReturn = Math.pow(1 + periodReturn, 365 / days) - 1;
      const volatility = this.calculateVolatility(returns) * Math.sqrt(365);
      const sharpeRatio = (annualizedReturn - this.riskFreeRate) / volatility;
      const maxDrawdown = this.calculateMaxDrawdown(snapshots);
      const winRate = this.calculateWinRate(returns);
      const profitFactor = this.calculateProfitFactor(returns);
      
      // Calculate beta and alpha against Solana ecosystem
      const benchmarkReturns = this.solanaIndices['SOLANA_ECOSYSTEM'].returns.slice(-days);
      const beta = this.calculateBeta(returns, benchmarkReturns);
      const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);
      const alpha = (periodReturn - benchmarkReturn) - beta * benchmarkReturn;
      
      const informationRatio = this.calculateInformationRatio(returns, benchmarkReturns);
      const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);
      const sortinoRatio = this.calculateSortinoRatio(returns, this.riskFreeRate);
      const treynorRatio = (annualizedReturn - this.riskFreeRate) / beta;

      const metrics: PerformanceMetrics = {
        totalReturn: periodReturn,
        totalReturnPercentage: periodReturn * 100,
        annualizedReturn,
        volatility,
        sharpeRatio,
        maxDrawdown,
        winRate,
        profitFactor,
        beta,
        alpha,
        informationRatio,
        calmarRatio,
        sortinoRatio,
        treynorRatio
      };

      // Store metrics on blockchain if wallet is available
      if (this.userWallet) {
        await this.storeMetricsOnChain(userId, days, metrics);
      }

      return metrics;
    } catch (error) {
      console.error('Failed to calculate performance metrics from blockchain:', error);
      throw error;
    }
  }

  private async storeMetricsOnChain(userId: string, timeFrame: number, metrics: PerformanceMetrics) {
    if (!this.userWallet) return;

    try {
      const onChainMetrics: OnChainPerformanceMetrics = {
        userId,
        timeFrame,
        calculatedAt: Date.now(),
        totalReturn: metrics.totalReturn,
        annualizedReturn: metrics.annualizedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        maxDrawdown: metrics.maxDrawdown,
        winRate: metrics.winRate,
        beta: metrics.beta,
        alpha: metrics.alpha,
        valueAtRisk95: 0, // Will be calculated by risk service
        valueAtRisk99: 0
      };

      await solanaStorage.storePerformanceMetrics(this.userWallet, onChainMetrics);
      console.log('Performance metrics stored on blockchain');
    } catch (error) {
      console.error('Failed to store metrics on blockchain:', error);
    }
  }

  private convertFromOnChainMetrics(onChainMetrics: OnChainPerformanceMetrics): PerformanceMetrics {
    return {
      totalReturn: onChainMetrics.totalReturn,
      totalReturnPercentage: onChainMetrics.totalReturn * 100,
      annualizedReturn: onChainMetrics.annualizedReturn,
      volatility: onChainMetrics.volatility,
      sharpeRatio: onChainMetrics.sharpeRatio,
      maxDrawdown: onChainMetrics.maxDrawdown,
      winRate: onChainMetrics.winRate,
      profitFactor: 0, // Not stored on-chain due to space constraints
      beta: onChainMetrics.beta,
      alpha: onChainMetrics.alpha,
      informationRatio: 0, // Calculate on demand
      calmarRatio: onChainMetrics.annualizedReturn / Math.abs(onChainMetrics.maxDrawdown),
      sortinoRatio: 0, // Calculate on demand
      treynorRatio: (onChainMetrics.annualizedReturn - this.riskFreeRate) / onChainMetrics.beta
    };
  }

  async calculateRiskMetrics(userId: string, days: number = 30): Promise<RiskMetrics> {
    const snapshots = await blockchainTransactionTracker.getPortfolioHistory(userId, days);
    const returns = this.calculateReturns(snapshots);
    const currentPnL = blockchainTransactionTracker.getCurrentPnL();
    
    const valueAtRisk95 = this.calculateVaR(returns, 0.95);
    const valueAtRisk99 = this.calculateVaR(returns, 0.99);
    const conditionalVaR95 = this.calculateConditionalVaR(returns, 0.95);
    const conditionalVaR99 = this.calculateConditionalVaR(returns, 0.99);
    const portfolioVolatility = this.calculateVolatility(returns) * Math.sqrt(365);
    
    const concentrationRisk = this.calculateConcentrationRisk(currentPnL);
    const liquidityRisk = this.calculateSolanaLiquidityRisk(currentPnL);
    const correlationRisk = this.calculateSolanaCorrelationRisk(currentPnL);
    const diversificationRatio = this.calculateDiversificationRatio(currentPnL);
    
    const benchmarkReturns = this.solanaIndices['SOLANA_ECOSYSTEM'].returns.slice(-days);
    const trackingError = this.calculateTrackingError(returns, benchmarkReturns);

    return {
      valueAtRisk95,
      valueAtRisk99,
      conditionalVaR95,
      conditionalVaR99,
      portfolioVolatility,
      concentrationRisk,
      liquidityRisk,
      correlationRisk,
      diversificationRatio,
      trackingError
    };
  }

  private calculateSolanaLiquidityRisk(pnlData: Record<string, PnLData>): number {
    // Solana-specific liquidity scores based on DEX volume and market depth
    const solanaLiquidityScores: Record<string, number> = {
      'SOL': 0.95,    // Highly liquid on all major DEXs
      'USDC': 0.98,   // Highest liquidity
      'mSOL': 0.85,   // Good liquidity on Marinade
      'RAY': 0.75,    // Good liquidity on Raydium
      'ORCA': 0.70,   // Good liquidity on Orca
      'SRM': 0.60,    // Medium liquidity (Serum deprecated)
      'FIDA': 0.45,   // Lower liquidity
      'SAMO': 0.30,   // Lower liquidity meme token
      'STEP': 0.40,   // Medium liquidity
      'COPE': 0.35,   // Lower liquidity
    };
    
    const values = Object.values(pnlData);
    const totalValue = values.reduce((sum, data) => sum + data.currentValue, 0);
    
    if (totalValue === 0) return 0;
    
    const weightedLiquidity = values.reduce((sum, data) => {
      const weight = data.currentValue / totalValue;
      const liquidity = solanaLiquidityScores[data.asset] || 0.5;
      return sum + weight * liquidity;
    }, 0);
    
    return 1 - weightedLiquidity; // Return as risk (higher is riskier)
  }

  private calculateSolanaCorrelationRisk(pnlData: Record<string, PnLData>): number {
    // Solana ecosystem correlation matrix based on real market behavior
    const solanaCorrelationMatrix: Record<string, Record<string, number>> = {
      'SOL': { 'SOL': 1.0, 'mSOL': 0.98, 'RAY': 0.85, 'ORCA': 0.80, 'USDC': 0.05, 'SRM': 0.75 },
      'mSOL': { 'SOL': 0.98, 'mSOL': 1.0, 'RAY': 0.80, 'ORCA': 0.75, 'USDC': 0.05, 'SRM': 0.70 },
      'RAY': { 'SOL': 0.85, 'mSOL': 0.80, 'RAY': 1.0, 'ORCA': 0.90, 'USDC': 0.10, 'SRM': 0.85 },
      'ORCA': { 'SOL': 0.80, 'mSOL': 0.75, 'RAY': 0.90, 'ORCA': 1.0, 'USDC': 0.10, 'SRM': 0.80 },
      'USDC': { 'SOL': 0.05, 'mSOL': 0.05, 'RAY': 0.10, 'ORCA': 0.10, 'USDC': 1.0, 'SRM': 0.05 },
      'SRM': { 'SOL': 0.75, 'mSOL': 0.70, 'RAY': 0.85, 'ORCA': 0.80, 'USDC': 0.05, 'SRM': 1.0 },
    };
    
    const assets = Object.keys(pnlData);
    const totalValue = Object.values(pnlData).reduce((sum, data) => sum + data.currentValue, 0);
    
    if (totalValue === 0 || assets.length < 2) return 0;
    
    let avgCorrelation = 0;
    let pairCount = 0;
    
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        const weight1 = pnlData[asset1].currentValue / totalValue;
        const weight2 = pnlData[asset2].currentValue / totalValue;
        const correlation = solanaCorrelationMatrix[asset1]?.[asset2] || 0.6; // Default higher correlation for Solana ecosystem
        
        avgCorrelation += weight1 * weight2 * correlation;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? avgCorrelation / pairCount : 0;
  }

  async benchmarkComparison(userId: string, benchmarkSymbol: string, days: number = 30): Promise<BenchmarkComparison> {
    const benchmark = this.solanaIndices[benchmarkSymbol];
    if (!benchmark) {
      throw new Error(`Solana benchmark ${benchmarkSymbol} not found`);
    }

    const snapshots = await blockchainTransactionTracker.getPortfolioHistory(userId, days);
    const portfolioReturns = this.calculateReturns(snapshots);
    const benchmarkReturns = benchmark.returns.slice(-days);
    
    const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0);
    const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);
    const outperformance = portfolioReturn - benchmarkReturn;
    
    const beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
    const alpha = portfolioReturn - (this.riskFreeRate + beta * (benchmarkReturn - this.riskFreeRate));
    const informationRatio = this.calculateInformationRatio(portfolioReturns, benchmarkReturns);
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
    
    const upCapture = this.calculateUpCapture(portfolioReturns, benchmarkReturns);
    const downCapture = this.calculateDownCapture(portfolioReturns, benchmarkReturns);

    return {
      benchmark: benchmark.name,
      portfolioReturn,
      benchmarkReturn,
      outperformance,
      beta,
      alpha,
      informationRatio,
      trackingError,
      upCapture,
      downCapture
    };
  }

  // All the calculation methods remain the same as the original implementation
  private calculateReturns(snapshots: PortfolioSnapshot[]): number[] {
    const returns = [];
    for (let i = 1; i < snapshots.length; i++) {
      const currentValue = snapshots[i].totalValue;
      const previousValue = snapshots[i - 1].totalValue;
      const dailyReturn = (currentValue - previousValue) / previousValue;
      returns.push(dailyReturn);
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): number {
    let maxDrawdown = 0;
    let peak = snapshots[0].totalValue;
    
    for (const snapshot of snapshots) {
      if (snapshot.totalValue > peak) {
        peak = snapshot.totalValue;
      }
      
      const drawdown = (peak - snapshot.totalValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  private calculateWinRate(returns: number[]): number {
    const wins = returns.filter(r => r > 0).length;
    return wins / returns.length;
  }

  private calculateProfitFactor(returns: number[]): number {
    const profits = returns.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
    const losses = Math.abs(returns.filter(r => r < 0).reduce((sum, r) => sum + r, 0));
    return losses > 0 ? profits / losses : profits > 0 ? Infinity : 0;
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const portfolioMean = portfolioReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    const benchmarkMean = benchmarkReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const portfolioDeviation = portfolioReturns[i] - portfolioMean;
      const benchmarkDeviation = benchmarkReturns[i] - benchmarkMean;
      
      numerator += portfolioDeviation * benchmarkDeviation;
      denominator += benchmarkDeviation * benchmarkDeviation;
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  private calculateVaR(returns: number[], confidenceLevel: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  private calculateConditionalVaR(returns: number[], confidenceLevel: number): number {
    const var95 = this.calculateVaR(returns, confidenceLevel);
    const tailReturns = returns.filter(r => r <= var95);
    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  private calculateInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const excessReturns = portfolioReturns.map((r, i) => r - (benchmarkReturns[i] || 0));
    const excessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = this.calculateVolatility(excessReturns);
    
    return trackingError > 0 ? excessReturn / trackingError : 0;
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    const excessReturns = returns.map(r => r - riskFreeRate / 365);
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    const downside = excessReturns.filter(r => r < 0);
    const downsideDeviation = downside.length > 0 
      ? Math.sqrt(downside.reduce((sum, r) => sum + r * r, 0) / downside.length)
      : 0;
    
    return downsideDeviation > 0 ? meanExcessReturn / downsideDeviation : 0;
  }

  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const excessReturns = portfolioReturns.map((r, i) => r - (benchmarkReturns[i] || 0));
    return this.calculateVolatility(excessReturns);
  }

  private calculateUpCapture(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const upPeriods = portfolioReturns
      .map((r, i) => ({ portfolio: r, benchmark: benchmarkReturns[i] }))
      .filter(period => period.benchmark > 0);
    
    if (upPeriods.length === 0) return 0;
    
    const avgPortfolioUp = upPeriods.reduce((sum, p) => sum + p.portfolio, 0) / upPeriods.length;
    const avgBenchmarkUp = upPeriods.reduce((sum, p) => sum + p.benchmark, 0) / upPeriods.length;
    
    return avgBenchmarkUp > 0 ? avgPortfolioUp / avgBenchmarkUp : 0;
  }

  private calculateDownCapture(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const downPeriods = portfolioReturns
      .map((r, i) => ({ portfolio: r, benchmark: benchmarkReturns[i] }))
      .filter(period => period.benchmark < 0);
    
    if (downPeriods.length === 0) return 0;
    
    const avgPortfolioDown = downPeriods.reduce((sum, p) => sum + p.portfolio, 0) / downPeriods.length;
    const avgBenchmarkDown = downPeriods.reduce((sum, p) => sum + p.benchmark, 0) / downPeriods.length;
    
    return avgBenchmarkDown < 0 ? avgPortfolioDown / avgBenchmarkDown : 0;
  }

  private calculateConcentrationRisk(pnlData: Record<string, PnLData>): number {
    const values = Object.values(pnlData);
    const totalValue = values.reduce((sum, data) => sum + data.currentValue, 0);
    
    if (totalValue === 0) return 0;
    
    const weights = values.map(data => data.currentValue / totalValue);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    
    return herfindahlIndex;
  }

  private calculateDiversificationRatio(pnlData: Record<string, PnLData>): number {
    const values = Object.values(pnlData);
    const totalValue = values.reduce((sum, data) => sum + data.currentValue, 0);
    
    if (totalValue === 0) return 0;
    
    const weights = values.map(data => data.currentValue / totalValue);
    const effectiveN = 1 / weights.reduce((sum, w) => sum + w * w, 0);
    
    return effectiveN / values.length;
  }

  async generatePortfolioInsights(userId: string, days: number = 30): Promise<string> {
    try {
      const [performance, risk, solanaBenchmark, defiBenchmark] = await Promise.all([
        this.calculatePerformanceMetrics(userId, days),
        this.calculateRiskMetrics(userId, days),
        this.benchmarkComparison(userId, 'SOL', days),
        this.benchmarkComparison(userId, 'SOLANA_DEFI_INDEX', days)
      ]);

      const summary = blockchainTransactionTracker.getPortfolioSummary();
      
      const prompt = `Analyze this Solana blockchain portfolio with on-chain verified data:

BLOCKCHAIN PERFORMANCE METRICS:
- Total Return: ${performance.totalReturnPercentage.toFixed(2)}%
- Annualized Return: ${(performance.annualizedReturn * 100).toFixed(2)}%
- Volatility: ${(performance.volatility * 100).toFixed(2)}%
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%
- Beta vs Solana: ${performance.beta.toFixed(2)}
- Alpha: ${(performance.alpha * 100).toFixed(2)}%

ON-CHAIN RISK METRICS:
- Value at Risk (95%): ${(risk.valueAtRisk95 * 100).toFixed(2)}%
- Portfolio Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%
- Solana Liquidity Risk: ${(risk.liquidityRisk * 100).toFixed(2)}%

SOLANA ECOSYSTEM BENCHMARKS:
SOL: ${solanaBenchmark.outperformance > 0 ? 'OUTPERFORMED' : 'UNDERPERFORMED'} by ${(solanaBenchmark.outperformance * 100).toFixed(2)}%
DeFi Index: ${defiBenchmark.outperformance > 0 ? 'OUTPERFORMED' : 'UNDERPERFORMED'} by ${(defiBenchmark.outperformance * 100).toFixed(2)}%

PORTFOLIO COMPOSITION (Blockchain Verified):
${Object.values(blockchainTransactionTracker.getCurrentPnL()).map(data => 
  `${data.asset}: ${((data.currentValue / summary.totalValue) * 100).toFixed(1)}% (${data.pnlPercentage.toFixed(1)}% P&L)`
).join('\n')}

Provide Solana-specific recommendations for:
1. DeFi yield optimization strategies
2. Solana ecosystem risk management
3. Cross-protocol rebalancing opportunities
4. Blockchain-verified performance insights
5. Solana-native asset allocation improvements`;

      const insights = await openaiService.generateCompletion(prompt);
      return insights;
    } catch (error) {
      console.error('Failed to generate blockchain portfolio insights:', error);
      return 'Unable to generate insights from blockchain data at this time.';
    }
  }

  getAvailableBenchmarks(): string[] {
    return Object.keys(this.solanaIndices);
  }

  getBenchmarkData(symbol: string): SolanaMarketIndex | undefined {
    return this.solanaIndices[symbol];
  }

  getBlockchainInfo() {
    return {
      connection: solanaStorage.getConnection(),
      programId: solanaStorage.getProgramId(),
      hasWallet: !!this.userWallet,
      availableBenchmarks: this.getAvailableBenchmarks(),
      riskFreeRate: this.riskFreeRate
    };
  }
}

export const blockchainPortfolioAnalytics = new BlockchainPortfolioAnalytics(); 