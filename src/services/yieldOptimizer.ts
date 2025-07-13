import { openaiService } from './openaiService';
import { riskAssessmentService } from './riskAssessment';

// Yield calculation interfaces
interface YieldPosition {
  protocol: string;
  asset: string;
  amount: number;
  apy: number;
  compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  lockPeriod: number; // days
  minimumDeposit: number;
  maximumDeposit: number;
  fees: {
    depositFee: number;
    withdrawalFee: number;
    managementFee: number;
  };
  risks: {
    impermanentLoss: number;
    liquidityRisk: number;
    smartContractRisk: number;
  };
}

interface YieldProjection {
  timeframe: number; // months
  principal: number;
  interest: number;
  totalValue: number;
  effectiveAPY: number;
  compoundingGain: number;
}

interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  positions: YieldPosition[];
  totalAPY: number;
  totalRisk: number;
  diversificationScore: number;
  liquidityScore: number;
  projections: YieldProjection[];
  rebalanceFrequency: number; // days
  aiOptimization: string;
}

interface YieldOpportunity {
  id: string;
  protocol: string;
  name: string;
  category: 'staking' | 'lending' | 'liquidity' | 'yield_farming' | 'structured';
  apy: number;
  tvl: number;
  volume24h: number;
  risk: 'low' | 'medium' | 'high';
  lockPeriod: number;
  minimumDeposit: number;
  sustainability: number; // 1-10 score
  yieldStability: number; // 1-10 score
  historicalPerformance: number[];
  fees: {
    entry: number;
    exit: number;
    management: number;
  };
}

interface CompoundingCalculation {
  principal: number;
  rate: number;
  compoundingFrequency: number;
  time: number;
  fees: number;
  result: {
    finalAmount: number;
    totalInterest: number;
    effectiveAPY: number;
    compoundingEffect: number;
  };
}

class YieldOptimizationService {
  private readonly YIELD_OPPORTUNITIES: YieldOpportunity[] = [
    {
      id: 'marinade-msol',
      protocol: 'Marinade',
      name: 'Liquid Staking (mSOL)',
      category: 'staking',
      apy: 7.2,
      tvl: 1200000000,
      volume24h: 15000000,
      risk: 'low',
      lockPeriod: 0,
      minimumDeposit: 0.1,
      sustainability: 9,
      yieldStability: 8,
      historicalPerformance: [6.8, 7.1, 7.0, 7.2, 7.3, 7.2],
      fees: { entry: 0, exit: 0, management: 0.02 }
    },
    {
      id: 'solend-usdc',
      protocol: 'Solend',
      name: 'USDC Lending',
      category: 'lending',
      apy: 4.8,
      tvl: 450000000,
      volume24h: 8000000,
      risk: 'low',
      lockPeriod: 0,
      minimumDeposit: 10,
      sustainability: 8,
      yieldStability: 9,
      historicalPerformance: [4.2, 4.5, 4.8, 5.1, 4.9, 4.8],
      fees: { entry: 0, exit: 0, management: 0.01 }
    },
    {
      id: 'orca-sol-usdc',
      protocol: 'Orca',
      name: 'SOL/USDC Liquidity Pool',
      category: 'liquidity',
      apy: 12.4,
      tvl: 45000000,
      volume24h: 2300000,
      risk: 'medium',
      lockPeriod: 0,
      minimumDeposit: 1,
      sustainability: 6,
      yieldStability: 5,
      historicalPerformance: [8.2, 10.5, 12.1, 11.8, 12.4, 13.2],
      fees: { entry: 0.1, exit: 0.1, management: 0.03 }
    },
    {
      id: 'raydium-ray-sol',
      protocol: 'Raydium',
      name: 'RAY/SOL Yield Farm',
      category: 'yield_farming',
      apy: 18.7,
      tvl: 23000000,
      volume24h: 1200000,
      risk: 'high',
      lockPeriod: 7,
      minimumDeposit: 0.5,
      sustainability: 4,
      yieldStability: 3,
      historicalPerformance: [25.3, 20.1, 18.7, 22.4, 16.8, 18.7],
      fees: { entry: 0.2, exit: 0.2, management: 0.05 }
    },
    {
      id: 'francium-leveraged-sol',
      protocol: 'Francium',
      name: 'Leveraged SOL Farming',
      category: 'structured',
      apy: 22.8,
      tvl: 12000000,
      volume24h: 800000,
      risk: 'high',
      lockPeriod: 14,
      minimumDeposit: 2,
      sustainability: 3,
      yieldStability: 2,
      historicalPerformance: [19.2, 24.5, 22.8, 28.1, 20.3, 22.8],
      fees: { entry: 0.3, exit: 0.3, management: 0.08 }
    }
  ];

  // Calculate compound interest with various frequencies
  calculateCompoundInterest(
    principal: number,
    annualRate: number,
    compoundingFrequency: number,
    years: number,
    fees: number = 0
  ): CompoundingCalculation {
    const adjustedRate = annualRate - fees;
    const finalAmount = principal * Math.pow(1 + adjustedRate / compoundingFrequency, compoundingFrequency * years);
    const totalInterest = finalAmount - principal;
    const effectiveAPY = Math.pow(1 + adjustedRate / compoundingFrequency, compoundingFrequency) - 1;
    
    // Calculate compounding effect by comparing to simple interest
    const simpleInterest = principal * adjustedRate * years;
    const compoundingEffect = totalInterest - simpleInterest;

    return {
      principal,
      rate: annualRate,
      compoundingFrequency,
      time: years,
      fees,
      result: {
        finalAmount,
        totalInterest,
        effectiveAPY,
        compoundingEffect
      }
    };
  }

  // Generate yield projections for multiple time periods
  generateYieldProjections(
    principal: number,
    apy: number,
    compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
    fees: number = 0
  ): YieldProjection[] {
    const timeframes = [1, 3, 6, 12, 24, 36]; // months
    const frequencies = {
      daily: 365,
      weekly: 52,
      monthly: 12,
      yearly: 1
    };
    
    const frequency = frequencies[compoundingFrequency];
    
    return timeframes.map(months => {
      const years = months / 12;
      const calculation = this.calculateCompoundInterest(principal, apy / 100, frequency, years, fees);
      
      return {
        timeframe: months,
        principal,
        interest: calculation.result.totalInterest,
        totalValue: calculation.result.finalAmount,
        effectiveAPY: calculation.result.effectiveAPY * 100,
        compoundingGain: calculation.result.compoundingEffect
      };
    });
  }

  // Optimize yield strategy based on user preferences
  async optimizeYieldStrategy(
    totalAmount: number,
    riskTolerance: 'low' | 'medium' | 'high',
    timeHorizon: number, // months
    diversificationPreference: 'concentrated' | 'balanced' | 'diversified'
  ): Promise<YieldStrategy> {
    // Filter opportunities based on risk tolerance
    const suitableOpportunities = this.YIELD_OPPORTUNITIES.filter(opp => {
      if (riskTolerance === 'low') return opp.risk === 'low';
      if (riskTolerance === 'medium') return opp.risk === 'low' || opp.risk === 'medium';
      return true; // high risk tolerance accepts all
    });

    // Calculate optimal allocation
    const allocation = this.calculateOptimalAllocation(
      suitableOpportunities,
      totalAmount,
      diversificationPreference
    );

    // Create yield positions
    const positions: YieldPosition[] = allocation.map(alloc => ({
      protocol: alloc.opportunity.protocol,
      asset: alloc.opportunity.name,
      amount: alloc.amount,
      apy: alloc.opportunity.apy,
      compoundingFrequency: this.getOptimalCompoundingFrequency(alloc.opportunity),
      lockPeriod: alloc.opportunity.lockPeriod,
      minimumDeposit: alloc.opportunity.minimumDeposit,
      maximumDeposit: alloc.amount * 2, // Mock limit
      fees: {
        depositFee: alloc.opportunity.fees.entry,
        withdrawalFee: alloc.opportunity.fees.exit,
        managementFee: alloc.opportunity.fees.management
      },
      risks: {
        impermanentLoss: alloc.opportunity.category === 'liquidity' ? 5.2 : 0,
        liquidityRisk: this.calculateLiquidityRisk(alloc.opportunity),
        smartContractRisk: this.calculateSmartContractRisk(alloc.opportunity)
      }
    }));

    // Calculate strategy metrics
    const totalAPY = this.calculateWeightedAPY(positions);
    const totalRisk = this.calculateStrategyRisk(positions);
    const diversificationScore = this.calculateDiversificationScore(positions);
    const liquidityScore = this.calculateLiquidityScore(positions);

    // Generate projections
    const projections = this.generateStrategyProjections(positions, timeHorizon);

    // Generate AI optimization insights
    const aiOptimization = await this.generateAIOptimization(positions, totalAPY, totalRisk);

    return {
      id: `strategy-${Date.now()}`,
      name: `Optimized ${riskTolerance} Risk Strategy`,
      description: `AI-optimized yield strategy for ${riskTolerance} risk tolerance with ${diversificationPreference} diversification`,
      positions,
      totalAPY,
      totalRisk,
      diversificationScore,
      liquidityScore,
      projections,
      rebalanceFrequency: this.calculateOptimalRebalanceFrequency(positions),
      aiOptimization
    };
  }

  // Compare multiple yield opportunities
  compareYieldOpportunities(opportunities: YieldOpportunity[]): {
    bestOverall: YieldOpportunity;
    bestRiskAdjusted: YieldOpportunity;
    bestLiquidity: YieldOpportunity;
    bestSustainability: YieldOpportunity;
    comparison: Array<{
      opportunity: YieldOpportunity;
      scores: {
        yield: number;
        risk: number;
        liquidity: number;
        sustainability: number;
        overall: number;
      };
    }>;
  } {
    const comparison = opportunities.map(opp => {
      const yieldScore = Math.min(opp.apy / 25 * 10, 10); // Normalize to 0-10
      const riskScore = opp.risk === 'low' ? 10 : opp.risk === 'medium' ? 7 : 4;
      const liquidityScore = opp.lockPeriod === 0 ? 10 : Math.max(10 - opp.lockPeriod / 30, 1);
      const sustainabilityScore = opp.sustainability;
      const overall = (yieldScore + riskScore + liquidityScore + sustainabilityScore) / 4;

      return {
        opportunity: opp,
        scores: {
          yield: yieldScore,
          risk: riskScore,
          liquidity: liquidityScore,
          sustainability: sustainabilityScore,
          overall
        }
      };
    });

    // Sort by different criteria
    const sortedByOverall = [...comparison].sort((a, b) => b.scores.overall - a.scores.overall);
    const sortedByRiskAdjusted = [...comparison].sort((a, b) => 
      (b.scores.yield * b.scores.risk) - (a.scores.yield * a.scores.risk)
    );
    const sortedByLiquidity = [...comparison].sort((a, b) => b.scores.liquidity - a.scores.liquidity);
    const sortedBySustainability = [...comparison].sort((a, b) => b.scores.sustainability - a.scores.sustainability);

    return {
      bestOverall: sortedByOverall[0].opportunity,
      bestRiskAdjusted: sortedByRiskAdjusted[0].opportunity,
      bestLiquidity: sortedByLiquidity[0].opportunity,
      bestSustainability: sortedBySustainability[0].opportunity,
      comparison
    };
  }

  // Calculate impermanent loss for liquidity positions
  calculateImpermanentLoss(
    initialPriceA: number,
    initialPriceB: number,
    finalPriceA: number,
    finalPriceB: number,
    lpTokens: number
  ): {
    impermanentLoss: number;
    percentageLoss: number;
    comparedToHodl: number;
  } {
    const priceRatio = (finalPriceA / initialPriceA) / (finalPriceB / initialPriceB);
    const sqrtRatio = Math.sqrt(priceRatio);
    
    // Calculate pool value after price change
    const poolValue = 2 * sqrtRatio / (1 + priceRatio);
    
    // Calculate what holding would have been worth
    const holdValue = 0.5 * (finalPriceA / initialPriceA) + 0.5 * (finalPriceB / initialPriceB);
    
    const impermanentLoss = (poolValue - holdValue) * lpTokens;
    const percentageLoss = ((poolValue - holdValue) / holdValue) * 100;
    
    return {
      impermanentLoss,
      percentageLoss,
      comparedToHodl: impermanentLoss
    };
  }

  // Get all available yield opportunities
  getYieldOpportunities(): YieldOpportunity[] {
    return this.YIELD_OPPORTUNITIES;
  }

  // Calculate optimal position sizing for risk management
  calculateOptimalPositionSize(
    totalPortfolio: number,
    riskTolerance: number,
    opportunityRisk: number,
    correlation: number
  ): number {
    // Kelly Criterion adapted for DeFi
    const expectedReturn = 0.1; // 10% expected return
    const variance = Math.pow(opportunityRisk, 2);
    const kellyFraction = expectedReturn / variance;
    
    // Adjust for correlation and risk tolerance
    const adjustedFraction = kellyFraction * (1 - correlation) * riskTolerance;
    
    // Cap at 25% of portfolio for safety
    const maxFraction = 0.25;
    const optimalFraction = Math.min(adjustedFraction, maxFraction);
    
    return totalPortfolio * optimalFraction;
  }

  // Private helper methods
  private calculateOptimalAllocation(
    opportunities: YieldOpportunity[],
    totalAmount: number,
    diversification: 'concentrated' | 'balanced' | 'diversified'
  ): Array<{ opportunity: YieldOpportunity; amount: number }> {
    const maxPositions = diversification === 'concentrated' ? 2 : 
                        diversification === 'balanced' ? 3 : 5;
    
    // Sort by risk-adjusted return
    const sortedOpportunities = opportunities
      .sort((a, b) => (b.apy / this.getRiskWeight(b.risk)) - (a.apy / this.getRiskWeight(a.risk)))
      .slice(0, maxPositions);

    // Equal weight allocation (can be improved with portfolio theory)
    const baseAllocation = totalAmount / sortedOpportunities.length;
    
    return sortedOpportunities.map(opp => ({
      opportunity: opp,
      amount: Math.max(baseAllocation, opp.minimumDeposit)
    }));
  }

  private getOptimalCompoundingFrequency(opportunity: YieldOpportunity): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    if (opportunity.category === 'yield_farming') return 'daily';
    if (opportunity.category === 'liquidity') return 'weekly';
    if (opportunity.category === 'lending') return 'monthly';
    return 'yearly';
  }

  private calculateLiquidityRisk(opportunity: YieldOpportunity): number {
    if (opportunity.lockPeriod === 0) return 1;
    return Math.min(opportunity.lockPeriod / 30 * 3, 10);
  }

  private calculateSmartContractRisk(opportunity: YieldOpportunity): number {
    // Based on protocol maturity and audit status
    const protocolRisk = {
      'Marinade': 2,
      'Solend': 3,
      'Orca': 4,
      'Raydium': 5,
      'Francium': 7
    };
    
    return protocolRisk[opportunity.protocol as keyof typeof protocolRisk] || 5;
  }

  private calculateWeightedAPY(positions: YieldPosition[]): number {
    const totalAmount = positions.reduce((sum, pos) => sum + pos.amount, 0);
    return positions.reduce((sum, pos) => sum + (pos.apy * pos.amount / totalAmount), 0);
  }

  private calculateStrategyRisk(positions: YieldPosition[]): number {
    const totalAmount = positions.reduce((sum, pos) => sum + pos.amount, 0);
    return positions.reduce((sum, pos) => {
      const positionRisk = (pos.risks.impermanentLoss + pos.risks.liquidityRisk + pos.risks.smartContractRisk) / 3;
      return sum + (positionRisk * pos.amount / totalAmount);
    }, 0);
  }

  private calculateDiversificationScore(positions: YieldPosition[]): number {
    const protocols = new Set(positions.map(p => p.protocol));
    const categories = new Set(positions.map(p => this.getPositionCategory(p)));
    
    return Math.min((protocols.size * 2 + categories.size * 3) / 2, 10);
  }

  private calculateLiquidityScore(positions: YieldPosition[]): number {
    const avgLockPeriod = positions.reduce((sum, pos) => sum + pos.lockPeriod, 0) / positions.length;
    return Math.max(10 - avgLockPeriod / 10, 1);
  }

  private generateStrategyProjections(positions: YieldPosition[], timeHorizon: number): YieldProjection[] {
    const totalAmount = positions.reduce((sum, pos) => sum + pos.amount, 0);
    const weightedAPY = this.calculateWeightedAPY(positions);
    
    return this.generateYieldProjections(totalAmount, weightedAPY, 'daily', 0.02);
  }

  private calculateOptimalRebalanceFrequency(positions: YieldPosition[]): number {
    const avgVolatility = positions.reduce((sum, pos) => sum + this.getPositionVolatility(pos), 0) / positions.length;
    
    if (avgVolatility > 0.5) return 7; // Weekly
    if (avgVolatility > 0.3) return 14; // Bi-weekly
    return 30; // Monthly
  }

  private async generateAIOptimization(positions: YieldPosition[], totalAPY: number, totalRisk: number): Promise<string> {
    try {
      const prompt = `Analyze this DeFi yield strategy:
      Total APY: ${totalAPY.toFixed(2)}%
      Total Risk: ${totalRisk.toFixed(2)}/10
      Positions: ${positions.map(p => `${p.protocol} ${p.asset} (${p.apy}% APY)`).join(', ')}
      
      Provide optimization recommendations focusing on:
      1. Risk-return balance
      2. Diversification improvements
      3. Rebalancing suggestions
      4. Market timing considerations
      
      Keep response under 150 words.`;
      
      return await openaiService.getChatResponse(prompt);
    } catch (error) {
      return `Strategy shows ${totalAPY.toFixed(1)}% APY with ${totalRisk.toFixed(1)}/10 risk. Consider rebalancing based on market conditions and monitoring position sizes.`;
    }
  }

  private getRiskWeight(risk: 'low' | 'medium' | 'high'): number {
    return risk === 'low' ? 1 : risk === 'medium' ? 2 : 3;
  }

  private getPositionCategory(position: YieldPosition): string {
    if (position.protocol === 'Marinade') return 'staking';
    if (position.protocol === 'Solend') return 'lending';
    if (position.protocol === 'Orca') return 'liquidity';
    if (position.protocol === 'Raydium') return 'yield_farming';
    return 'other';
  }

  private getPositionVolatility(position: YieldPosition): number {
    // Mock volatility based on protocol
    const volatilityMap = {
      'Marinade': 0.2,
      'Solend': 0.1,
      'Orca': 0.4,
      'Raydium': 0.6,
      'Francium': 0.8
    };
    
    return volatilityMap[position.protocol as keyof typeof volatilityMap] || 0.3;
  }
}

export const yieldOptimizer = new YieldOptimizationService();
export type { YieldStrategy, YieldOpportunity, YieldProjection, YieldPosition, CompoundingCalculation }; 