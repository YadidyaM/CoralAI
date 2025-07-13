import { transactionTracker, PortfolioSnapshot, PnLData } from './transactionTracker';
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

export interface MarketIndex {
  symbol: string;
  name: string;
  returns: number[];
  timestamps: number[];
  currentPrice: number;
  historicalData: { price: number; timestamp: number }[];
}

class PortfolioAnalytics {
  private marketIndices: Record<string, MarketIndex> = {};
  private riskFreeRate = 0.05; // 5% annual risk-free rate

  constructor() {
    this.initializeMarketIndices();
  }

  private initializeMarketIndices() {
    // Initialize with mock market data - in real implementation, fetch from APIs
    this.marketIndices = {
      'SOL': {
        symbol: 'SOL',
        name: 'Solana',
        returns: this.generateMockReturns(365, 0.12, 0.65), // 12% mean, 65% volatility
        timestamps: this.generateTimestamps(365),
        currentPrice: 160.50,
        historicalData: this.generateHistoricalData(365, 160.50, 0.65)
      },
      'CRYPTO_INDEX': {
        symbol: 'CRYPTO_INDEX',
        name: 'Crypto Market Index',
        returns: this.generateMockReturns(365, 0.08, 0.45), // 8% mean, 45% volatility
        timestamps: this.generateTimestamps(365),
        currentPrice: 100,
        historicalData: this.generateHistoricalData(365, 100, 0.45)
      },
      'DEFI_INDEX': {
        symbol: 'DEFI_INDEX',
        name: 'DeFi Index',
        returns: this.generateMockReturns(365, 0.15, 0.75), // 15% mean, 75% volatility
        timestamps: this.generateTimestamps(365),
        currentPrice: 100,
        historicalData: this.generateHistoricalData(365, 100, 0.75)
      },
      'SPY': {
        symbol: 'SPY',
        name: 'S&P 500',
        returns: this.generateMockReturns(365, 0.10, 0.16), // 10% mean, 16% volatility
        timestamps: this.generateTimestamps(365),
        currentPrice: 450,
        historicalData: this.generateHistoricalData(365, 450, 0.16)
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
    const returns = this.generateMockReturns(days, 0.10, volatility);
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
    const snapshots = await transactionTracker.getPortfolioHistory(userId, days);
    
    if (snapshots.length < 2) {
      throw new Error('Insufficient data for performance calculations');
    }

    const returns = this.calculateReturns(snapshots);
    const periodReturn = (snapshots[snapshots.length - 1].totalValue - snapshots[0].totalValue) / snapshots[0].totalValue;
    
    const annualizedReturn = Math.pow(1 + periodReturn, 365 / days) - 1;
    const volatility = this.calculateVolatility(returns) * Math.sqrt(365);
    const sharpeRatio = (annualizedReturn - this.riskFreeRate) / volatility;
    const maxDrawdown = this.calculateMaxDrawdown(snapshots);
    const winRate = this.calculateWinRate(returns);
    const profitFactor = this.calculateProfitFactor(returns);
    
    // Calculate beta and alpha against crypto index
    const benchmarkReturns = this.marketIndices['CRYPTO_INDEX'].returns.slice(-days);
    const beta = this.calculateBeta(returns, benchmarkReturns);
    const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);
    const alpha = (periodReturn - benchmarkReturn) - beta * benchmarkReturn;
    
    const informationRatio = this.calculateInformationRatio(returns, benchmarkReturns);
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);
    const sortinoRatio = this.calculateSortinoRatio(returns, this.riskFreeRate);
    const treynorRatio = (annualizedReturn - this.riskFreeRate) / beta;

    return {
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
  }

  async calculateRiskMetrics(userId: string, days: number = 30): Promise<RiskMetrics> {
    const snapshots = await transactionTracker.getPortfolioHistory(userId, days);
    const returns = this.calculateReturns(snapshots);
    const currentPnL = transactionTracker.getCurrentPnL();
    
    const valueAtRisk95 = this.calculateVaR(returns, 0.95);
    const valueAtRisk99 = this.calculateVaR(returns, 0.99);
    const conditionalVaR95 = this.calculateConditionalVaR(returns, 0.95);
    const conditionalVaR99 = this.calculateConditionalVaR(returns, 0.99);
    const portfolioVolatility = this.calculateVolatility(returns) * Math.sqrt(365);
    
    const concentrationRisk = this.calculateConcentrationRisk(currentPnL);
    const liquidityRisk = this.calculateLiquidityRisk(currentPnL);
    const correlationRisk = this.calculateCorrelationRisk(currentPnL);
    const diversificationRatio = this.calculateDiversificationRatio(currentPnL);
    
    const benchmarkReturns = this.marketIndices['CRYPTO_INDEX'].returns.slice(-days);
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

  async benchmarkComparison(userId: string, benchmarkSymbol: string, days: number = 30): Promise<BenchmarkComparison> {
    const benchmark = this.marketIndices[benchmarkSymbol];
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkSymbol} not found`);
    }

    const snapshots = await transactionTracker.getPortfolioHistory(userId, days);
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

  private calculateLiquidityRisk(pnlData: Record<string, PnLData>): number {
    // Mock liquidity scores - in real implementation, use actual liquidity data
    const liquidityScores: Record<string, number> = {
      'SOL': 0.9,
      'USDC': 1.0,
      'mSOL': 0.7,
      'RAY': 0.6,
      'ORCA': 0.5,
      'SRM': 0.4,
      'FIDA': 0.3,
      'SAMO': 0.2,
    };
    
    const values = Object.values(pnlData);
    const totalValue = values.reduce((sum, data) => sum + data.currentValue, 0);
    
    if (totalValue === 0) return 0;
    
    const weightedLiquidity = values.reduce((sum, data) => {
      const weight = data.currentValue / totalValue;
      const liquidity = liquidityScores[data.asset] || 0.5;
      return sum + weight * liquidity;
    }, 0);
    
    return 1 - weightedLiquidity; // Return as risk (higher is riskier)
  }

  private calculateCorrelationRisk(pnlData: Record<string, PnLData>): number {
    // Mock correlation matrix - in real implementation, calculate from price data
    const correlationMatrix: Record<string, Record<string, number>> = {
      'SOL': { 'SOL': 1.0, 'mSOL': 0.95, 'RAY': 0.8, 'ORCA': 0.7, 'USDC': 0.1 },
      'mSOL': { 'SOL': 0.95, 'mSOL': 1.0, 'RAY': 0.75, 'ORCA': 0.65, 'USDC': 0.1 },
      'RAY': { 'SOL': 0.8, 'mSOL': 0.75, 'RAY': 1.0, 'ORCA': 0.85, 'USDC': 0.15 },
      'ORCA': { 'SOL': 0.7, 'mSOL': 0.65, 'RAY': 0.85, 'ORCA': 1.0, 'USDC': 0.15 },
      'USDC': { 'SOL': 0.1, 'mSOL': 0.1, 'RAY': 0.15, 'ORCA': 0.15, 'USDC': 1.0 },
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
        const correlation = correlationMatrix[asset1]?.[asset2] || 0.5;
        
        avgCorrelation += weight1 * weight2 * correlation;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? avgCorrelation / pairCount : 0;
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
      const [performance, risk, cryptoBenchmark, defiBenchmark] = await Promise.all([
        this.calculatePerformanceMetrics(userId, days),
        this.calculateRiskMetrics(userId, days),
        this.benchmarkComparison(userId, 'CRYPTO_INDEX', days),
        this.benchmarkComparison(userId, 'DEFI_INDEX', days)
      ]);

      const summary = transactionTracker.getPortfolioSummary();
      
      const prompt = `Analyze this comprehensive portfolio data and provide actionable insights:

PERFORMANCE METRICS:
- Total Return: ${performance.totalReturnPercentage.toFixed(2)}%
- Annualized Return: ${(performance.annualizedReturn * 100).toFixed(2)}%
- Volatility: ${(performance.volatility * 100).toFixed(2)}%
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%
- Beta: ${performance.beta.toFixed(2)}
- Alpha: ${(performance.alpha * 100).toFixed(2)}%

RISK METRICS:
- Value at Risk (95%): ${(risk.valueAtRisk95 * 100).toFixed(2)}%
- Value at Risk (99%): ${(risk.valueAtRisk99 * 100).toFixed(2)}%
- Portfolio Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%
- Liquidity Risk: ${(risk.liquidityRisk * 100).toFixed(2)}%

BENCHMARK COMPARISON:
Crypto Index: ${cryptoBenchmark.outperformance > 0 ? 'OUTPERFORMED' : 'UNDERPERFORMED'} by ${(cryptoBenchmark.outperformance * 100).toFixed(2)}%
DeFi Index: ${defiBenchmark.outperformance > 0 ? 'OUTPERFORMED' : 'UNDERPERFORMED'} by ${(defiBenchmark.outperformance * 100).toFixed(2)}%

PORTFOLIO COMPOSITION:
${Object.values(transactionTracker.getCurrentPnL()).map(data => 
  `${data.asset}: ${((data.currentValue / summary.totalValue) * 100).toFixed(1)}% (${data.pnlPercentage.toFixed(1)}% P&L)`
).join('\n')}

Provide specific, actionable recommendations for:
1. Performance optimization strategies
2. Risk management improvements
3. Portfolio rebalancing suggestions
4. Market timing insights
5. Asset allocation adjustments`;

      const insights = await openaiService.generateCompletion(prompt);
      return insights;
    } catch (error) {
      console.error('Failed to generate portfolio insights:', error);
      return 'Unable to generate portfolio insights at this time.';
    }
  }

  getAvailableBenchmarks(): string[] {
    return Object.keys(this.marketIndices);
  }

  getBenchmarkData(symbol: string): MarketIndex | undefined {
    return this.marketIndices[symbol];
  }
}

export const portfolioAnalytics = new PortfolioAnalytics(); 