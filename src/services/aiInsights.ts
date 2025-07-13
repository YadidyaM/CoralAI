import { openaiService } from './openaiService';
import { portfolioAnalytics, PerformanceMetrics, RiskMetrics, BenchmarkComparison } from './portfolioAnalytics';
import { transactionTracker, PnLData, PortfolioSnapshot } from './transactionTracker';
import { yieldOptimizer, YieldOpportunity } from './yieldOptimizer';
import { riskAssessmentService, PortfolioRisk } from './riskAssessment';

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
}

export interface MarketInsight {
  id: string;
  type: 'trend' | 'opportunity' | 'risk' | 'news';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  timeFrame: 'short' | 'medium' | 'long';
  actionable: boolean;
  relatedAssets: string[];
  source: string;
  timestamp: number;
}

export interface PersonalizedRecommendation {
  id: string;
  category: 'performance' | 'risk' | 'diversification' | 'yield' | 'cost';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  potentialBenefit: string;
  implementation: string;
  timeRequired: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: number;
  reasoning: string;
}

export interface AIInsightsReport {
  summary: string;
  overallScore: number;
  recommendations: PersonalizedRecommendation[];
  rebalancing: RebalancingRecommendation[];
  marketInsights: MarketInsight[];
  nextReviewDate: number;
  riskAlerts: string[];
  opportunities: string[];
}

class AIInsights {
  private lastAnalysis: AIInsightsReport | null = null;
  private lastAnalysisTime: number = 0;
  private readonly ANALYSIS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async generateComprehensiveReport(userId: string, timeFrame: number = 30): Promise<AIInsightsReport> {
    // Check cache
    if (this.lastAnalysis && (Date.now() - this.lastAnalysisTime) < this.ANALYSIS_CACHE_DURATION) {
      return this.lastAnalysis;
    }

    try {
      // Gather all portfolio data
      await transactionTracker.initialize(userId);
      
      const [
        performance,
        risk,
        cryptoBenchmark,
        defiBenchmark,
        currentPnL,
        portfolioSummary,
        yieldOpportunities,
        riskAssessmentData
      ] = await Promise.all([
        portfolioAnalytics.calculatePerformanceMetrics(userId, timeFrame),
        portfolioAnalytics.calculateRiskMetrics(userId, timeFrame),
        portfolioAnalytics.benchmarkComparison(userId, 'CRYPTO_INDEX', timeFrame),
        portfolioAnalytics.benchmarkComparison(userId, 'DEFI_INDEX', timeFrame),
        Promise.resolve(transactionTracker.getCurrentPnL()),
        Promise.resolve(transactionTracker.getPortfolioSummary()),
        yieldOptimizer.findBestOpportunities(Object.values(transactionTracker.getCurrentPnL())),
        riskAssessmentService.assessPortfolioRisk(Object.values(transactionTracker.getCurrentPnL()))
      ]);

      // Generate insights using AI
      const summary = await this.generatePortfolioSummary(performance, risk, portfolioSummary);
      const recommendations = await this.generatePersonalizedRecommendations(
        performance, risk, currentPnL, portfolioSummary
      );
      const rebalancing = await this.generateRebalancingRecommendations(
        currentPnL, performance, risk, riskAssessmentData
      );
      const marketInsights = await this.generateMarketInsights(currentPnL, performance, risk);
      const overallScore = this.calculateOverallScore(performance, risk, portfolioSummary);

      const report: AIInsightsReport = {
        summary,
        overallScore,
        recommendations,
        rebalancing,
        marketInsights,
        nextReviewDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
        riskAlerts: this.generateRiskAlerts(risk, riskAssessmentData),
        opportunities: this.generateOpportunities(yieldOpportunities, performance)
      };

      this.lastAnalysis = report;
      this.lastAnalysisTime = Date.now();

      return report;
    } catch (error) {
      console.error('Failed to generate comprehensive report:', error);
      throw error;
    }
  }

  private async generatePortfolioSummary(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    portfolioSummary: any
  ): Promise<string> {
    const prompt = `Generate a concise portfolio summary based on these metrics:

Performance:
- Total Return: ${(performance.totalReturnPercentage).toFixed(2)}%
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%

Risk:
- VaR (95%): ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(2)}%
- Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%

Portfolio:
- Total Value: $${portfolioSummary.totalValue.toFixed(2)}
- Total P&L: $${portfolioSummary.totalPnL.toFixed(2)}
- Assets: ${portfolioSummary.assetCount}

Provide a 2-3 sentence executive summary focusing on key strengths and areas for improvement.`;

    return await openaiService.generateCompletion(prompt);
  }

  private async generatePersonalizedRecommendations(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    currentPnL: Record<string, PnLData>,
    portfolioSummary: any
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Performance recommendations
    if (performance.sharpeRatio < 1.0) {
      recommendations.push({
        id: 'improve_sharpe',
        category: 'performance',
        title: 'Improve Risk-Adjusted Returns',
        description: 'Your Sharpe ratio is below optimal levels. Consider rebalancing towards assets with better risk-adjusted returns.',
        priority: 'high',
        potentialBenefit: 'Increase returns while maintaining similar risk levels',
        implementation: 'Reduce allocation to underperforming assets, increase high-Sharpe assets',
        timeRequired: '1-2 weeks',
        difficulty: 'medium',
        estimatedImpact: 15,
        reasoning: `Current Sharpe ratio: ${performance.sharpeRatio.toFixed(2)}`
      });
    }

    // Risk recommendations
    if (risk.concentrationRisk > 0.5) {
      recommendations.push({
        id: 'diversify_portfolio',
        category: 'risk',
        title: 'Reduce Concentration Risk',
        description: 'Your portfolio is heavily concentrated in a few assets. Consider diversifying to reduce risk.',
        priority: 'high',
        potentialBenefit: 'Lower portfolio volatility and drawdown risk',
        implementation: 'Redistribute positions across more assets or sectors',
        timeRequired: '2-3 weeks',
        difficulty: 'medium',
        estimatedImpact: 20,
        reasoning: `Concentration risk: ${(risk.concentrationRisk * 100).toFixed(1)}%`
      });
    }

    // Yield optimization
    const lowYieldAssets = Object.values(currentPnL).filter(asset => 
      asset.pnlPercentage < 5 && asset.currentValue > portfolioSummary.totalValue * 0.1
    );
    
    if (lowYieldAssets.length > 0) {
      recommendations.push({
        id: 'optimize_yield',
        category: 'yield',
        title: 'Optimize Yield Generation',
        description: 'Some large positions are generating low returns. Consider yield farming or staking opportunities.',
        priority: 'medium',
        potentialBenefit: 'Increase passive income generation',
        implementation: 'Stake assets or provide liquidity to earn additional yield',
        timeRequired: '1 week',
        difficulty: 'easy',
        estimatedImpact: 10,
        reasoning: `${lowYieldAssets.length} underperforming positions identified`
      });
    }

    // Generate AI recommendations
    const aiRecommendations = await this.generateAIRecommendations(performance, risk, currentPnL);
    recommendations.push(...aiRecommendations);

    return recommendations.slice(0, 6); // Return top 6 recommendations
  }

  private async generateAIRecommendations(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    currentPnL: Record<string, PnLData>
  ): Promise<PersonalizedRecommendation[]> {
    const prompt = `Based on this portfolio analysis, suggest 2-3 specific actionable recommendations:

Performance Metrics:
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(2)}%
- Win Rate: ${(performance.winRate * 100).toFixed(2)}%
- Beta: ${performance.beta.toFixed(2)}

Risk Metrics:
- VaR (95%): ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(2)}%
- Concentration Risk: ${(risk.concentrationRisk * 100).toFixed(2)}%
- Liquidity Risk: ${(risk.liquidityRisk * 100).toFixed(2)}%

Asset Performance:
${Object.values(currentPnL).map(asset => 
  `${asset.asset}: ${asset.pnlPercentage.toFixed(1)}% P&L, $${asset.currentValue.toFixed(0)} value`
).join('\n')}

For each recommendation, provide:
1. Title (concise)
2. Category (performance/risk/diversification/yield/cost)
3. Description (one sentence)
4. Priority (low/medium/high)
5. Potential benefit
6. Implementation steps
7. Estimated impact (1-100)

Format as JSON array.`;

    try {
      const response = await openaiService.generateCompletion(prompt);
      const parsed = JSON.parse(response);
      
      return parsed.map((rec: any, index: number) => ({
        id: `ai_rec_${index}`,
        category: rec.category || 'performance',
        title: rec.title || 'AI Recommendation',
        description: rec.description || 'No description provided',
        priority: rec.priority || 'medium',
        potentialBenefit: rec.potentialBenefit || 'Portfolio improvement',
        implementation: rec.implementation || 'See details',
        timeRequired: '1-2 weeks',
        difficulty: 'medium',
        estimatedImpact: rec.estimatedImpact || 10,
        reasoning: 'AI-generated recommendation based on portfolio analysis'
      }));
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      return [];
    }
  }

  private async generateRebalancingRecommendations(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    riskAssessmentData: PortfolioRisk
  ): Promise<RebalancingRecommendation[]> {
    const recommendations: RebalancingRecommendation[] = [];
    const totalValue = Object.values(currentPnL).reduce((sum, asset) => sum + asset.currentValue, 0);
    
    // Ideal allocation based on risk-adjusted performance
    const idealAllocations = await this.calculateIdealAllocations(currentPnL, performance, risk);
    
    for (const [asset, pnlData] of Object.entries(currentPnL)) {
      const currentAllocation = pnlData.currentValue / totalValue;
      const targetAllocation = idealAllocations[asset] || 0;
      const difference = Math.abs(currentAllocation - targetAllocation);
      
      if (difference > 0.05) { // 5% threshold
        const action = currentAllocation > targetAllocation ? 'sell' : 'buy';
        const amount = Math.abs(currentAllocation - targetAllocation) * totalValue;
        
        recommendations.push({
          id: `rebalance_${asset}`,
          type: 'rebalance',
          asset,
          currentAllocation,
          targetAllocation,
          action,
          amount,
          reasoning: `${action === 'sell' ? 'Reduce' : 'Increase'} allocation to optimize risk-adjusted returns`,
          urgency: difference > 0.15 ? 'high' : difference > 0.10 ? 'medium' : 'low',
          expectedImpact: `${difference > 0.15 ? 'Significant' : 'Moderate'} improvement in portfolio balance`,
          riskLevel: this.assessRebalanceRisk(asset, action, amount, riskAssessmentData),
          estimatedReturn: this.estimateRebalanceReturn(asset, action, performance),
          timeFrame: 'immediate',
          confidence: 0.8
        });
      }
    }

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  private async generateMarketInsights(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics
  ): Promise<MarketInsight[]> {
    const insights: MarketInsight[] = [];
    const assets = Object.keys(currentPnL);
    
    // Generate market insights using AI
    const prompt = `Generate 3-4 market insights for a DeFi portfolio containing: ${assets.join(', ')}

Consider current market conditions, DeFi trends, and the portfolio's performance metrics:
- Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}
- Volatility: ${(risk.portfolioVolatility * 100).toFixed(2)}%
- Beta: ${performance.beta.toFixed(2)}

For each insight, provide:
1. Type (trend/opportunity/risk/news)
2. Title
3. Description
4. Impact (positive/negative/neutral)
5. Time frame (short/medium/long)
6. Actionable (true/false)
7. Related assets

Format as JSON array.`;

    try {
      const response = await openaiService.generateCompletion(prompt);
      const parsed = JSON.parse(response);
      
      return parsed.map((insight: any, index: number) => ({
        id: `market_insight_${index}`,
        type: insight.type || 'trend',
        title: insight.title || 'Market Insight',
        description: insight.description || 'No description provided',
        impact: insight.impact || 'neutral',
        confidence: 0.7,
        timeFrame: insight.timeFrame || 'medium',
        actionable: insight.actionable || false,
        relatedAssets: insight.relatedAssets || assets,
        source: 'AI Analysis',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to generate market insights:', error);
      return [];
    }
  }

  private calculateOverallScore(
    performance: PerformanceMetrics,
    risk: RiskMetrics,
    portfolioSummary: any
  ): number {
    let score = 50; // Base score

    // Performance factors
    if (performance.sharpeRatio > 1.5) score += 15;
    else if (performance.sharpeRatio > 1.0) score += 10;
    else if (performance.sharpeRatio > 0.5) score += 5;

    if (performance.totalReturnPercentage > 20) score += 15;
    else if (performance.totalReturnPercentage > 10) score += 10;
    else if (performance.totalReturnPercentage > 0) score += 5;

    if (performance.maxDrawdown < 0.15) score += 10;
    else if (performance.maxDrawdown < 0.25) score += 5;
    else score -= 5;

    // Risk factors
    if (risk.concentrationRisk < 0.3) score += 10;
    else if (risk.concentrationRisk < 0.5) score += 5;
    else score -= 5;

    if (risk.liquidityRisk < 0.3) score += 5;
    else if (risk.liquidityRisk > 0.7) score -= 5;

    // Diversification
    if (portfolioSummary.assetCount >= 5) score += 10;
    else if (portfolioSummary.assetCount >= 3) score += 5;
    else score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateRiskAlerts(risk: RiskMetrics, riskAssessment: PortfolioRisk): string[] {
    const alerts: string[] = [];

    if (Math.abs(risk.valueAtRisk95) > 0.15) {
      alerts.push(`High VaR detected: ${(Math.abs(risk.valueAtRisk95) * 100).toFixed(1)}% potential loss`);
    }

    if (risk.concentrationRisk > 0.6) {
      alerts.push('Portfolio is highly concentrated - consider diversification');
    }

    if (risk.liquidityRisk > 0.7) {
      alerts.push('High liquidity risk - some positions may be difficult to exit');
    }

    if (riskAssessment.overallScore > 0.7) {
      alerts.push('Overall portfolio risk is elevated - consider reducing exposure');
    }

    return alerts;
  }

  private generateOpportunities(yieldOpportunities: YieldOpportunity[], performance: PerformanceMetrics): string[] {
    const opportunities: string[] = [];

    if (yieldOpportunities.length > 0) {
      const bestYield = yieldOpportunities[0];
      opportunities.push(`${bestYield.protocol} offers ${(bestYield.apy * 100).toFixed(1)}% APY on ${bestYield.asset}`);
    }

    if (performance.beta > 1.2) {
      opportunities.push('Consider adding some uncorrelated assets to reduce beta');
    }

    if (performance.sharpeRatio < 1.0) {
      opportunities.push('Portfolio could benefit from rebalancing towards higher Sharpe ratio assets');
    }

    return opportunities;
  }

  private async calculateIdealAllocations(
    currentPnL: Record<string, PnLData>,
    performance: PerformanceMetrics,
    risk: RiskMetrics
  ): Promise<Record<string, number>> {
    // Simple allocation based on risk-adjusted performance
    const allocations: Record<string, number> = {};
    const assets = Object.entries(currentPnL);
    
    // Calculate scores for each asset
    const scores = assets.map(([asset, data]) => {
      const returnScore = Math.max(0, data.pnlPercentage);
      const riskScore = 1 / (1 + Math.abs(data.pnlPercentage) * 0.1); // Lower volatility = higher score
      const sizeScore = data.currentValue / 1000; // Normalize by size
      
      return {
        asset,
        score: returnScore * 0.5 + riskScore * 0.3 + sizeScore * 0.2
      };
    });

    // Normalize scores to allocations
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    
    for (const { asset, score } of scores) {
      allocations[asset] = totalScore > 0 ? score / totalScore : 1 / assets.length;
    }

    return allocations;
  }

  private assessRebalanceRisk(asset: string, action: 'buy' | 'sell', amount: number, riskAssessment: PortfolioRisk): 'low' | 'medium' | 'high' {
    // Mock risk assessment - in real implementation, use actual risk models
    if (amount > 10000) return 'high';
    if (amount > 5000) return 'medium';
    return 'low';
  }

  private estimateRebalanceReturn(asset: string, action: 'buy' | 'sell', performance: PerformanceMetrics): number {
    // Mock return estimation - in real implementation, use predictive models
    const baseReturn = performance.annualizedReturn * 0.1;
    return action === 'buy' ? baseReturn : -baseReturn;
  }
}

export const aiInsights = new AIInsights(); 