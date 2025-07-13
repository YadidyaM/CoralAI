import { Keypair } from '@solana/web3.js';
import { openaiService } from './openaiService';
import { blockchainPortfolioAnalytics, PerformanceMetrics, RiskMetrics, BenchmarkComparison } from './blockchainPortfolioAnalytics';
import { blockchainTransactionTracker, PnLData, PortfolioSnapshot } from './blockchainTransactionTracker';
import { yieldOptimizer, YieldOpportunity } from './yieldOptimizer';
import { riskAssessmentService, PortfolioRisk } from './riskAssessment';
import { solanaStorage, OnChainAIInsights } from './solanaStorage';

export interface RebalancingRecommendation {
  id: string;
  type: 'rebalance' | 'add_position' | 'reduce_position' | 'diversify' | 'hedge';
  asset: string;
  currentAllocation: number;
  targetAllocation: number;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
  expectedImpact: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedReturn: number;
  timeFrame: string;
  confidence: number;
  solanaSpecific: {
    recommendedDEX: string;
    expectedSlippage: number;
    gasEstimate: number;
    liquidityDepth: number;
    priceImpact: number;
  };
}

export interface SolanaMarketInsight {
  id: string;
  type: 'defi_trend' | 'ecosystem_opportunity' | 'protocol_risk' | 'yield_farming' | 'governance' | 'validator_rewards';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  timeFrame: 'immediate' | 'short' | 'medium' | 'long';
  actionable: boolean;
  relatedAssets: string[];
  relatedProtocols: string[];
  source: string;
  onChainData: {
    tvl?: number;
    volume24h?: number;
    apr?: number;
    validatorStake?: number;
  };
  timestamp: number;
}

export interface PersonalizedRecommendation {
  id: string;
  category: 'yield_optimization' | 'risk_reduction' | 'diversification' | 'defi_opportunities' | 'validator_staking';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  potentialBenefit: string;
  implementation: string;
  timeRequired: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: number;
  reasoning: string;
  solanaContext: {
    requiredSOL: number;
    networkFees: number;
    protocolFees: number;
    estimatedAPY: number;
    slashingRisk: number;
  };
}

export interface BlockchainAIInsightsReport {
  summary: string;
  overallScore: number;
  recommendations: PersonalizedRecommendation[];
  rebalancing: RebalancingRecommendation[];
  marketInsights: SolanaMarketInsight[];
  nextReviewDate: number;
  riskAlerts: string[];
  opportunities: string[];
  solanaEcosystem: {
    stakingRewards: number;
    validatorPerformance: string;
    networkHealth: string;
    ecosystemGrowth: string;
    defiTVL: number;
  };
  onChainSignature?: string; // Blockchain transaction storing these insights
}

class BlockchainAIInsights {
  private lastAnalysis: BlockchainAIInsightsReport | null = null;
  private lastAnalysisTime: number = 0;
  private readonly ANALYSIS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private userWallet: Keypair | null = null;

  setUserWallet(wallet: Keypair) {
    this.userWallet = wallet;
  }

  async generateComprehensiveReport(userId: string, timeFrame: number = 30): Promise<BlockchainAIInsightsReport> {
    // Check blockchain cache first
    if (this.userWallet) {
      const cachedInsights = await this.getCachedInsightsFromChain(userId, timeFrame);
      if (cachedInsights && (Date.now() - cachedInsights.generatedAt) < this.ANALYSIS_CACHE_DURATION) {
        return await this.convertFromOnChainInsights(cachedInsights);
      }
    }

    try {
      // Gather all portfolio data from blockchain
      await blockchainTransactionTracker.initialize(userId);
      
      const [
        performance,
        risk,
        solanaBenchmark,
        defiBenchmark,
        currentPnL,
        portfolioSummary,
        yieldOpportunities,
        riskAssessmentData
      ] = await Promise.all([
        blockchainPortfolioAnalytics.calculatePerformanceMetrics(userId, timeFrame),
        blockchainPortfolioAnalytics.calculateRiskMetrics(userId, timeFrame),
        blockchainPortfolioAnalytics.benchmarkComparison(userId, 'SOL', timeFrame),
        blockchainPortfolioAnalytics.benchmarkComparison(userId, 'SOLANA_DEFI_INDEX', timeFrame),
        Promise.resolve(blockchainTransactionTracker.getCurrentPnL()),
        Promise.resolve(blockchainTransactionTracker.getPortfolioSummary()),
        yieldOptimizer.findBestOpportunities(Object.values(blockchainTransactionTracker.getCurrentPnL())),
        riskAssessmentService.assessPortfolioRisk(Object.values(blockchainTransactionTracker.getCurrentPnL()))
      ]);

      // Generate insights using AI with Solana-specific context
      const summary = await this.generateSolanaPortfolioSummary(performance, risk, portfolioSummary);
      const recommendations = await this.generateSolanaRecommendations(
        performance, risk, currentPnL, portfolioSummary
      );
      const rebalancing = await this.generateSolanaRebalancingRecommendations(
        currentPnL, performance, risk, riskAssessmentData
      );
      const marketInsights = await this.generateSolanaMarketInsights(currentPnL, performance, risk);
      const overallScore = this.calculateSolanaPortfolioScore(performance, risk, portfolioSummary);
      const solanaEcosystem = await this.analyzeSolanaEcosystem(currentPnL);

      const report: BlockchainAIInsightsReport = {
        summary,
        overallScore,
        recommendations,
        rebalancing,
        marketInsights,
        nextReviewDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
        riskAlerts: this.generateSolanaRiskAlerts(risk, riskAssessmentData),
        opportunities: this.generateSolanaOpportunities(yieldOpportunities, performance),
        solanaEcosystem
      };

      // Store insights on blockchain if wallet is available
      if (this.userWallet) {
        const signature = await this.storeInsightsOnChain(userId, timeFrame, report);
        report.onChainSignature = signature;
      }

      this.lastAnalysis = report;
      this.lastAnalysisTime = Date.now();

      return report;
    } catch (error) {
      console.error('Failed to generate comprehensive blockchain report:', error);
      throw error;
    }
  }

  private async getCachedInsightsFromChain(userId: string, timeFrame: number): Promise<OnChainAIInsights | null> {
    try {
      // This would query the blockchain for cached insights
      // For now, return null to force fresh calculation
      return null;
    } catch (error) {
      console.error('Failed to get cached insights from blockchain:', error);
      return null;
    }
  }

  private async convertFromOnChainInsights(onChainInsights: OnChainAIInsights): Promise<BlockchainAIInsightsReport> {
    // Convert blockchain format back to full report structure
    // This is a simplified version - in practice, you'd reconstruct the full report
    return {
      summary: onChainInsights.summary,
      overallScore: onChainInsights.overallScore,
      recommendations: [], // Would be loaded from separate blockchain accounts
      rebalancing: [],
      marketInsights: [],
      nextReviewDate: onChainInsights.generatedAt + (7 * 24 * 60 * 60 * 1000),
      riskAlerts: [],
      opportunities: [],
      solanaEcosystem: {
        stakingRewards: 0,
        validatorPerformance: 'Unknown',
        networkHealth: 'Unknown',
        ecosystemGrowth: 'Unknown',
        defiTVL: 0
      }
    };
  }

  private async storeInsightsOnChain(userId: string, timeFrame: number, report: BlockchainAIInsightsReport): Promise<string> {
    if (!this.userWallet) {
      throw new Error('User wallet not set for blockchain operations');
    }

    try {
      const onChainInsights: OnChainAIInsights = {
        userId,
        timeFrame,
        generatedAt: Date.now(),
        summary: report.summary,
        overallScore: report.overallScore
      };

      const recommendations = report.recommendations.map(rec => 
        `${rec.title}: ${rec.description} (Priority: ${rec.priority})`
      );

      const signature = await solanaStorage.storeAIInsights(this.userWallet, onChainInsights, recommendations);
      console.log('AI insights stored on blockchain with signature:', signature);
      return signature;
    } catch (error) {
      console.error('Failed to store insights on blockchain:', error);
      throw error;
    }
  }

  private async generateSolanaPortfolioSummary(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    portfolioSummary: any
  ): Promise<string> {
    const prompt = `Generate a concise Solana DeFi portfolio summary based on these blockchain-verified metrics:

Performance (On-Chain Verified):
- Total Return: ${(performance.totalReturnPercentage).toFixed(2)}%
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%

Risk (Blockchain Calculated):
- VaR (95%): ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(2)}%
- Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%

Portfolio (Solana Ecosystem):
- Total Value: $${portfolioSummary.totalValue.toFixed(2)}
- Total P&L: $${portfolioSummary.totalPnL.toFixed(2)}
- Assets: ${portfolioSummary.assetCount}

Provide a 2-3 sentence executive summary focusing on Solana DeFi performance, ecosystem positioning, and key optimization areas.`;

    return await openaiService.generateCompletion(prompt);
  }

  private async generateSolanaRecommendations(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    currentPnL: Record<string, PnLData>,
    portfolioSummary: any
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Staking optimization
    const solBalance = currentPnL['SOL']?.quantity || 0;
    if (solBalance > 1) { // At least 1 SOL for staking
      recommendations.push({
        id: 'optimize_sol_staking',
        category: 'validator_staking',
        title: 'Optimize SOL Staking Rewards',
        description: `Stake ${solBalance.toFixed(2)} SOL with high-performance validators to earn ~6-8% APY`,
        priority: 'medium',
        potentialBenefit: 'Earn passive rewards while supporting network security',
        implementation: 'Use Marinade Finance or Lido for liquid staking, or delegate directly to validators',
        timeRequired: '10 minutes',
        difficulty: 'easy',
        estimatedImpact: 15,
        reasoning: `${solBalance.toFixed(2)} SOL can generate significant staking rewards`,
        solanaContext: {
          requiredSOL: 0.01, // Minimum for transaction fees
          networkFees: 0.005,
          protocolFees: 0.03, // 3% for liquid staking
          estimatedAPY: 7.2,
          slashingRisk: 0.001 // Very low for established validators
        }
      });
    }

    // DeFi yield optimization
    const usdcBalance = currentPnL['USDC']?.currentValue || 0;
    if (usdcBalance > 100) {
      recommendations.push({
        id: 'defi_yield_farming',
        category: 'yield_optimization',
        title: 'DeFi Yield Farming Opportunities',
        description: 'Provide liquidity to high-yield Solana DeFi protocols like Orca, Raydium, or Francium',
        priority: 'high',
        potentialBenefit: 'Earn 8-15% APY through liquidity provision and farming rewards',
        implementation: 'Start with stablecoin pools for lower risk, then explore SOL/token pairs',
        timeRequired: '30 minutes',
        difficulty: 'medium',
        estimatedImpact: 25,
        reasoning: `$${usdcBalance.toFixed(0)} USDC can be deployed for DeFi yields`,
        solanaContext: {
          requiredSOL: 0.1, // For transaction fees
          networkFees: 0.01,
          protocolFees: 0.25, // 0.25% LP fees
          estimatedAPY: 12.5,
          slashingRisk: 0.05 // Moderate risk for DeFi protocols
        }
      });
    }

    // Diversification for concentrated portfolios
    if (risk.concentrationRisk > 0.6) {
      recommendations.push({
        id: 'diversify_solana_ecosystem',
        category: 'diversification',
        title: 'Diversify Across Solana Ecosystem',
        description: 'Reduce concentration risk by adding exposure to different Solana sectors',
        priority: 'high',
        potentialBenefit: 'Lower portfolio volatility and capture broader ecosystem growth',
        implementation: 'Add positions in mSOL, RAY, ORCA, SRM, or other ecosystem tokens',
        timeRequired: '1 hour',
        difficulty: 'medium',
        estimatedImpact: 30,
        reasoning: `Concentration risk: ${(risk.concentrationRisk * 100).toFixed(1)}%`,
        solanaContext: {
          requiredSOL: 0.05,
          networkFees: 0.02,
          protocolFees: 0.30, // Swap fees
          estimatedAPY: 0,
          slashingRisk: 0.02
        }
      });
    }

    // Generate AI recommendations
    const aiRecommendations = await this.generateAISolanaRecommendations(performance, risk, currentPnL);
    recommendations.push(...aiRecommendations);

    return recommendations.slice(0, 6); // Return top 6 recommendations
  }

  private async generateAISolanaRecommendations(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    currentPnL: Record<string, PnLData>
  ): Promise<PersonalizedRecommendation[]> {
    const prompt = `Based on this Solana DeFi portfolio analysis, suggest 2-3 specific actionable recommendations:

Performance Metrics (Blockchain Verified):
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%
- Beta vs SOL: ${performance.beta.toFixed(2)}

Risk Metrics (On-Chain Calculated):
- VaR (95%): ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%
- Liquidity Risk: ${(risk.liquidityRisk * 100).toFixed(2)}%

Asset Performance (Solana Ecosystem):
${Object.values(currentPnL).map(asset => 
  `${asset.asset}: ${asset.pnlPercentage.toFixed(1)}% P&L, $${asset.currentValue.toFixed(0)} value`
).join('\n')}

For each recommendation, focus on Solana-specific opportunities:
1. Title (Solana DeFi focused)
2. Category (yield_optimization/risk_reduction/diversification/defi_opportunities/validator_staking)
3. Description (Solana ecosystem specific)
4. Priority (low/medium/high)
5. Potential benefit for Solana portfolio
6. Implementation steps using Solana protocols
7. Estimated impact (1-100)

Format as JSON array focusing on Solana DeFi ecosystem opportunities.`;

    try {
      const response = await openaiService.generateCompletion(prompt);
      const parsed = JSON.parse(response);
      
      return parsed.map((rec: any, index: number) => ({
        id: `ai_solana_rec_${index}`,
        category: rec.category || 'defi_opportunities',
        title: rec.title || 'Solana DeFi Opportunity',
        description: rec.description || 'No description provided',
        priority: rec.priority || 'medium',
        potentialBenefit: rec.potentialBenefit || 'Portfolio improvement in Solana ecosystem',
        implementation: rec.implementation || 'Use Solana DeFi protocols',
        timeRequired: '15-30 minutes',
        difficulty: 'medium',
        estimatedImpact: rec.estimatedImpact || 15,
        reasoning: 'AI-generated recommendation based on Solana blockchain analysis',
        solanaContext: {
          requiredSOL: 0.05,
          networkFees: 0.01,
          protocolFees: 0.25,
          estimatedAPY: 8.0,
          slashingRisk: 0.02
        }
      }));
    } catch (error) {
      console.error('Failed to generate AI Solana recommendations:', error);
      return [];
    }
  }

  private async generateSolanaRebalancingRecommendations(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    riskAssessmentData: PortfolioRisk
  ): Promise<RebalancingRecommendation[]> {
    const recommendations: RebalancingRecommendation[] = [];
    const totalValue = Object.values(currentPnL).reduce((sum, asset) => sum + asset.currentValue, 0);
    
    // Solana-optimized allocation based on ecosystem growth and risk
    const solanaOptimalAllocations = await this.calculateSolanaOptimalAllocations(currentPnL, performance, risk);
    
    for (const [asset, pnlData] of Object.entries(currentPnL)) {
      const currentAllocation = pnlData.currentValue / totalValue;
      const targetAllocation = solanaOptimalAllocations[asset] || 0;
      const difference = Math.abs(currentAllocation - targetAllocation);
      
      if (difference > 0.05) { // 5% threshold
        const action = currentAllocation > targetAllocation ? 'sell' : 'buy';
        const amount = Math.abs(currentAllocation - targetAllocation) * totalValue;
        
        recommendations.push({
          id: `solana_rebalance_${asset}`,
          type: 'rebalance',
          asset,
          currentAllocation,
          targetAllocation,
          action,
          amount,
          reasoning: `${action === 'sell' ? 'Reduce' : 'Increase'} allocation to optimize Solana ecosystem exposure`,
          urgency: difference > 0.15 ? 'high' : difference > 0.10 ? 'medium' : 'low',
          expectedImpact: `${difference > 0.15 ? 'Significant' : 'Moderate'} improvement in Solana portfolio balance`,
          riskLevel: this.assessSolanaRebalanceRisk(asset, action, amount, riskAssessmentData),
          estimatedReturn: this.estimateSolanaRebalanceReturn(asset, action, performance),
          timeFrame: 'immediate',
          confidence: 0.8,
          solanaSpecific: {
            recommendedDEX: this.getOptimalSolanaDEX(asset),
            expectedSlippage: this.calculateSolanaSlippage(asset, amount),
            gasEstimate: 0.01, // SOL for transaction fees
            liquidityDepth: this.getSolanaLiquidityDepth(asset),
            priceImpact: this.calculateSolanaPriceImpact(asset, amount)
          }
        });
      }
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  private async generateSolanaMarketInsights(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics
  ): Promise<SolanaMarketInsight[]> {
    const insights: SolanaMarketInsight[] = [];
    const assets = Object.keys(currentPnL);
    
    // Generate Solana-specific market insights
    const prompt = `Generate 3-4 Solana ecosystem market insights for a DeFi portfolio containing: ${assets.join(', ')}

Consider current Solana ecosystem conditions and DeFi trends:
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Beta vs SOL: ${performance.beta.toFixed(2)}

Focus on Solana-specific opportunities and risks:
1. Type (defi_trend/ecosystem_opportunity/protocol_risk/yield_farming/governance/validator_rewards)
2. Title (Solana ecosystem focused)
3. Description (Solana DeFi specific)
4. Impact (positive/negative/neutral)
5. Time frame (immediate/short/medium/long)
6. Actionable (true/false)
7. Related assets and protocols in Solana ecosystem

Format as JSON array with Solana DeFi focus.`;

    try {
      const response = await openaiService.generateCompletion(prompt);
      const parsed = JSON.parse(response);
      
      return parsed.map((insight: any, index: number) => ({
        id: `solana_insight_${index}`,
        type: insight.type || 'defi_trend',
        title: insight.title || 'Solana Market Insight',
        description: insight.description || 'No description provided',
        impact: insight.impact || 'neutral',
        confidence: 0.75,
        timeFrame: insight.timeFrame || 'medium',
        actionable: insight.actionable || false,
        relatedAssets: insight.relatedAssets || assets,
        relatedProtocols: insight.relatedProtocols || ['Orca', 'Raydium', 'Marinade'],
        source: 'Solana AI Analysis',
        onChainData: {
          tvl: Math.random() * 1000000000, // Mock TVL
          volume24h: Math.random() * 100000000, // Mock 24h volume
          apr: Math.random() * 20 + 5, // Mock APR between 5-25%
        },
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to generate Solana market insights:', error);
      return [];
    }
  }

  private calculateSolanaPortfolioScore(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    portfolioSummary: any
  ): number {
    let score = 50; // Base score

    // Solana-specific scoring factors
    if (performance.sharpeRatio > 2.0) score += 20; // Higher bar for DeFi
    else if (performance.sharpeRatio > 1.5) score += 15;
    else if (performance.sharpeRatio > 1.0) score += 10;
    else if (performance.sharpeRatio > 0.5) score += 5;

    // DeFi returns should be higher
    if (performance.totalReturnPercentage > 50) score += 20;
    else if (performance.totalReturnPercentage > 25) score += 15;
    else if (performance.totalReturnPercentage > 10) score += 10;
    else if (performance.totalReturnPercentage > 0) score += 5;

    // Solana ecosystem specific adjustments
    if (performance.maxDrawdown < 0.20) score += 10; // Lower drawdown tolerance for DeFi
    else if (performance.maxDrawdown < 0.35) score += 5;
    else score -= 10;

    // Risk factors (more stringent for DeFi)
    if (risk.concentrationRisk < 0.4) score += 10;
    else if (risk.concentrationRisk < 0.6) score += 5;
    else score -= 10;

    if (risk.liquidityRisk < 0.3) score += 5;
    else if (risk.liquidityRisk > 0.7) score -= 10;

    // Solana ecosystem diversification
    if (portfolioSummary.assetCount >= 4) score += 15; // Good Solana diversification
    else if (portfolioSummary.assetCount >= 2) score += 10;
    else score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private async analyzeSolanaEcosystem(currentPnL: Record<string, PnLData>) {
    // Mock Solana ecosystem analysis - in real implementation, query on-chain data
    return {
      stakingRewards: 7.2, // Current staking APY
      validatorPerformance: 'Excellent', // Based on network performance
      networkHealth: 'Strong', // Network metrics
      ecosystemGrowth: 'Expanding', // DeFi TVL growth
      defiTVL: 2500000000 // Mock total DeFi TVL in Solana ecosystem
    };
  }

  private generateSolanaRiskAlerts(risk: RiskMetrics, riskAssessment: PortfolioRisk): string[] {
    const alerts: string[] = [];

    if (Math.abs(risk.valueAtRisk95) > 0.20) { // Higher threshold for DeFi
      alerts.push(`High DeFi VaR detected: ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(1)}% potential loss`);
    }

    if (risk.concentrationRisk > 0.7) {
      alerts.push('Portfolio heavily concentrated in few Solana assets - consider ecosystem diversification');
    }

    if (risk.liquidityRisk > 0.8) {
      alerts.push('High liquidity risk detected - some Solana positions may have limited exit liquidity');
    }

    if (riskAssessmentData.overallScore > 0.75) {
      alerts.push('Overall Solana DeFi portfolio risk is elevated - consider reducing exposure or hedging');
    }

    return alerts;
  }

  private generateSolanaOpportunities(yieldOpportunities: YieldOpportunity[], performance: PerformanceMetrics): string[] {
    const opportunities: string[] = [];

    if (yieldOpportunities.length > 0) {
      const bestYield = yieldOpportunities[0];
      opportunities.push(`${bestYield.protocol} offers ${(bestYield.apy * 100).toFixed(1)}% APY on ${bestYield.asset} - high Solana DeFi yield`);
    }

    if (performance.beta > 1.3) {
      opportunities.push('Consider adding mSOL or other stable Solana assets to reduce portfolio beta');
    }

    if (performance.sharpeRatio < 1.5) { // Higher bar for DeFi
      opportunities.push('Solana portfolio could benefit from rebalancing towards higher risk-adjusted return assets');
    }

    opportunities.push('Explore Solana validator staking for 6-8% risk-free returns');
    opportunities.push('Consider Solana NFT exposure for ecosystem diversification');

    return opportunities;
  }

  // Helper methods for Solana-specific calculations
  private async calculateSolanaOptimalAllocations(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics
  ): Promise<Record<string, number>> {
    // Solana ecosystem optimal allocation based on performance and ecosystem growth
    const allocations: Record<string, number> = {};
    const assets = Object.entries(currentPnL);
    
    // Base allocations for Solana ecosystem
    const solanaEcosystemWeights = {
      'SOL': 0.40,      // Core ecosystem token
      'mSOL': 0.15,     // Liquid staking
      'USDC': 0.20,     // Stability
      'RAY': 0.10,      // DEX governance
      'ORCA': 0.10,     // Alternative DEX
      'SRM': 0.05,      // Legacy DEX (lower weight)
    };
    
    // Calculate scores for each asset with Solana context
    const scores = assets.map(([asset, data]) => {
      const returnScore = Math.max(0, data.pnlPercentage);
      const ecosystemWeight = solanaEcosystemWeights[asset] || 0.05;
      const liquidityScore = this.getSolanaLiquidityScore(asset);
      
      return {
        asset,
        score: returnScore * 0.4 + ecosystemWeight * 0.4 + liquidityScore * 0.2
      };
    });

    // Normalize scores to allocations
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    
    for (const { asset, score } of scores) {
      allocations[asset] = totalScore > 0 ? score / totalScore : 1 / assets.length;
    }

    return allocations;
  }

  private getSolanaLiquidityScore(asset: string): number {
    const liquidityScores: Record<string, number> = {
      'SOL': 1.0,
      'USDC': 1.0,
      'mSOL': 0.9,
      'RAY': 0.8,
      'ORCA': 0.8,
      'SRM': 0.6,
      'FIDA': 0.5,
      'SAMO': 0.3,
    };
    return liquidityScores[asset] || 0.5;
  }

  private getOptimalSolanaDEX(asset: string): string {
    const dexPreferences: Record<string, string> = {
      'SOL': 'Jupiter (aggregated)',
      'mSOL': 'Marinade',
      'RAY': 'Raydium',
      'ORCA': 'Orca',
      'USDC': 'Jupiter (aggregated)',
      'SRM': 'Serum',
    };
    return dexPreferences[asset] || 'Jupiter';
  }

  private calculateSolanaSlippage(asset: string, amount: number): number {
    // Mock slippage calculation based on asset and amount
    const baseSlippage = {
      'SOL': 0.1, 'USDC': 0.05, 'mSOL': 0.15, 'RAY': 0.3, 'ORCA': 0.3
    };
    const base = baseSlippage[asset] || 0.5;
    const impact = Math.min(amount / 10000, 2.0); // Price impact based on trade size
    return base + impact;
  }

  private getSolanaLiquidityDepth(asset: string): number {
    // Mock liquidity depth in USD
    const depths: Record<string, number> = {
      'SOL': 50000000, 'USDC': 100000000, 'mSOL': 10000000, 
      'RAY': 5000000, 'ORCA': 3000000, 'SRM': 1000000
    };
    return depths[asset] || 500000;
  }

  private calculateSolanaPriceImpact(asset: string, amount: number): number {
    const depth = this.getSolanaLiquidityDepth(asset);
    return Math.min((amount / depth) * 100, 10); // Max 10% price impact
  }

  private assessSolanaRebalanceRisk(asset: string, action: 'buy' | 'sell', amount: number, riskAssessment: PortfolioRisk): 'low' | 'medium' | 'high' {
    // Solana-specific risk assessment
    if (amount > 10000) return 'high';
    if (amount > 5000 || ['SRM', 'FIDA', 'SAMO'].includes(asset)) return 'medium';
    return 'low';
  }

  private estimateSolanaRebalanceReturn(asset: string, action: 'buy' | 'sell', performance: PerformanceMetrics): number {
    // Solana ecosystem expected returns
    const baseReturn = performance.annualizedReturn * 0.1;
    const assetMultiplier = {
      'SOL': 1.2, 'mSOL': 1.1, 'USDC': 0.8, 'RAY': 1.5, 'ORCA': 1.4
    };
    const multiplier = assetMultiplier[asset] || 1.0;
    return action === 'buy' ? baseReturn * multiplier : -baseReturn * multiplier;
  }

  getBlockchainInfo() {
    return {
      connection: solanaStorage.getConnection(),
      programId: solanaStorage.getProgramId(),
      hasWallet: !!this.userWallet,
      lastAnalysisTime: this.lastAnalysisTime,
      cacheTime: this.ANALYSIS_CACHE_DURATION,
      isInitialized: !!this.lastAnalysis
    };
  }
}

export const blockchainAIInsights = new BlockchainAIInsights(); 