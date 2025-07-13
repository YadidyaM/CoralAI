import { openaiService } from './openaiService';

// Risk assessment interfaces
interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
  category: 'technical' | 'market' | 'operational' | 'regulatory';
}

interface ProtocolRisk {
  protocolName: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  aiAnalysis: string;
  recommendations: string[];
  lastUpdated: Date;
}

interface PortfolioRisk {
  overallScore: number;
  diversificationScore: number;
  liquidityRisk: number;
  concentrationRisk: number;
  smartContractRisk: number;
  marketRisk: number;
  breakdown: ProtocolRisk[];
  recommendations: string[];
  riskTrend: 'increasing' | 'stable' | 'decreasing';
}

interface AssetRisk {
  symbol: string;
  name: string;
  volatility: number;
  liquidity: number;
  marketCap: number;
  riskScore: number;
  correlations: { [key: string]: number };
}

class RiskAssessmentService {
  private readonly riskWeights = {
    technical: 0.3,
    market: 0.35,
    operational: 0.2,
    regulatory: 0.15
  };

  private readonly protocolRiskFactors = {
    'marinade': {
      auditScore: 9,
      tvlScore: 9,
      teamScore: 8,
      communityScore: 8,
      codeQuality: 9
    },
    'orca': {
      auditScore: 8,
      tvlScore: 7,
      teamScore: 9,
      communityScore: 8,
      codeQuality: 8
    },
    'raydium': {
      auditScore: 7,
      tvlScore: 6,
      teamScore: 7,
      communityScore: 7,
      codeQuality: 7
    },
    'solend': {
      auditScore: 9,
      tvlScore: 8,
      teamScore: 8,
      communityScore: 7,
      codeQuality: 8
    }
  };

  // Calculate protocol-specific risk assessment
  async assessProtocolRisk(protocolName: string): Promise<ProtocolRisk> {
    const protocolData = this.protocolRiskFactors[protocolName.toLowerCase() as keyof typeof this.protocolRiskFactors];
    
    if (!protocolData) {
      throw new Error(`Protocol ${protocolName} not found in risk database`);
    }

    const factors: RiskFactor[] = [
      {
        name: 'Smart Contract Security',
        weight: 0.25,
        score: protocolData.auditScore,
        description: 'Code audit quality and security practices',
        category: 'technical'
      },
      {
        name: 'Total Value Locked',
        weight: 0.20,
        score: protocolData.tvlScore,
        description: 'Protocol size and adoption metrics',
        category: 'market'
      },
      {
        name: 'Team & Governance',
        weight: 0.15,
        score: protocolData.teamScore,
        description: 'Team experience and governance structure',
        category: 'operational'
      },
      {
        name: 'Community Trust',
        weight: 0.15,
        score: protocolData.communityScore,
        description: 'Community engagement and trust metrics',
        category: 'operational'
      },
      {
        name: 'Code Quality',
        weight: 0.25,
        score: protocolData.codeQuality,
        description: 'Code maintainability and development practices',
        category: 'technical'
      }
    ];

    const overallScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    const riskLevel = this.calculateRiskLevel(overallScore);
    
    // Generate AI analysis
    const aiAnalysis = await this.generateAIRiskAnalysis(protocolName, factors, overallScore);
    const recommendations = await this.generateRiskRecommendations(protocolName, factors, riskLevel);

    return {
      protocolName,
      overallScore,
      riskLevel,
      factors,
      aiAnalysis,
      recommendations,
      lastUpdated: new Date()
    };
  }

  // Calculate portfolio-wide risk assessment
  async assessPortfolioRisk(positions: any[]): Promise<PortfolioRisk> {
    const protocolRisks = await Promise.all(
      positions.map(async (pos) => {
        const protocol = this.extractProtocol(pos.category);
        return await this.assessProtocolRisk(protocol);
      })
    );

    const overallScore = this.calculatePortfolioOverallScore(positions, protocolRisks);
    const diversificationScore = this.calculateDiversificationScore(positions);
    const liquidityRisk = this.calculateLiquidityRisk(positions);
    const concentrationRisk = this.calculateConcentrationRisk(positions);
    const smartContractRisk = this.calculateSmartContractRisk(protocolRisks);
    const marketRisk = this.calculateMarketRisk(positions);

    const recommendations = await this.generatePortfolioRecommendations(
      overallScore,
      diversificationScore,
      concentrationRisk,
      positions
    );

    const riskTrend = this.calculateRiskTrend(positions);

    return {
      overallScore,
      diversificationScore,
      liquidityRisk,
      concentrationRisk,
      smartContractRisk,
      marketRisk,
      breakdown: protocolRisks,
      recommendations,
      riskTrend
    };
  }

  // Calculate impermanent loss risk for liquidity positions
  calculateImpermanentLossRisk(tokenA: string, tokenB: string, correlation: number): number {
    const volatilityA = this.getAssetVolatility(tokenA);
    const volatilityB = this.getAssetVolatility(tokenB);
    
    // IL risk increases with volatility difference and decreases with correlation
    const volatilityDiff = Math.abs(volatilityA - volatilityB);
    const correlationFactor = 1 - correlation;
    
    return Math.min(volatilityDiff * correlationFactor * 100, 100);
  }

  // Get real-time risk metrics for an asset
  getAssetRiskMetrics(symbol: string): AssetRisk {
    const mockData: { [key: string]: AssetRisk } = {
      'SOL': {
        symbol: 'SOL',
        name: 'Solana',
        volatility: 0.68,
        liquidity: 0.95,
        marketCap: 24000000000,
        riskScore: 6.5,
        correlations: { 'BTC': 0.7, 'ETH': 0.8, 'USDC': 0.1 }
      },
      'mSOL': {
        symbol: 'mSOL',
        name: 'Marinade Staked SOL',
        volatility: 0.65,
        liquidity: 0.85,
        marketCap: 800000000,
        riskScore: 5.8,
        correlations: { 'SOL': 0.98, 'BTC': 0.68, 'ETH': 0.75 }
      },
      'USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        volatility: 0.02,
        liquidity: 0.99,
        marketCap: 52000000000,
        riskScore: 2.1,
        correlations: { 'SOL': 0.1, 'BTC': 0.05, 'ETH': 0.08 }
      },
      'RAY': {
        symbol: 'RAY',
        name: 'Raydium',
        volatility: 0.89,
        liquidity: 0.65,
        marketCap: 180000000,
        riskScore: 8.2,
        correlations: { 'SOL': 0.85, 'BTC': 0.6, 'ETH': 0.7 }
      }
    };

    return mockData[symbol] || {
      symbol,
      name: symbol,
      volatility: 0.5,
      liquidity: 0.5,
      marketCap: 0,
      riskScore: 5.0,
      correlations: {}
    };
  }

  // Calculate Value at Risk (VaR) for portfolio
  calculateVaR(positions: any[], confidenceLevel: number = 0.95, timeHorizon: number = 1): number {
    const portfolioValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const portfolioVolatility = this.calculatePortfolioVolatility(positions);
    
    // Z-score for confidence levels
    const zScores: { [key: number]: number } = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };
    
    const zScore = zScores[confidenceLevel] || 1.645;
    const dailyVaR = portfolioValue * portfolioVolatility * zScore * Math.sqrt(timeHorizon);
    
    return dailyVaR;
  }

  // Calculate portfolio volatility considering correlations
  private calculatePortfolioVolatility(positions: any[]): number {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    let portfolioVariance = 0;
    
    for (let i = 0; i < positions.length; i++) {
      const pos1 = positions[i];
      const weight1 = pos1.value / totalValue;
      const risk1 = this.getAssetRiskMetrics(pos1.symbol);
      
      for (let j = 0; j < positions.length; j++) {
        const pos2 = positions[j];
        const weight2 = pos2.value / totalValue;
        const risk2 = this.getAssetRiskMetrics(pos2.symbol);
        
        const correlation = i === j ? 1 : (risk1.correlations[pos2.symbol] || 0.5);
        
        portfolioVariance += weight1 * weight2 * risk1.volatility * risk2.volatility * correlation;
      }
    }
    
    return Math.sqrt(portfolioVariance);
  }

  // Generate AI-powered risk analysis
  private async generateAIRiskAnalysis(protocolName: string, factors: RiskFactor[], overallScore: number): Promise<string> {
    try {
      const prompt = `Analyze the risk profile of ${protocolName} protocol with these factors:
      ${factors.map(f => `${f.name}: ${f.score}/10 (${f.description})`).join('\n')}
      
      Overall Score: ${overallScore.toFixed(1)}/10
      
      Provide a concise risk analysis focusing on:
      1. Key strengths and weaknesses
      2. Primary risk vectors
      3. Comparison to industry standards
      4. Risk mitigation strategies
      
      Keep response under 200 words.`;
      
      return await openaiService.getChatResponse(prompt);
    } catch (error) {
      return `Risk analysis for ${protocolName}: Score ${overallScore.toFixed(1)}/10. Consider factors like smart contract security, TVL stability, and team track record when evaluating this protocol.`;
    }
  }

  // Generate risk recommendations
  private async generateRiskRecommendations(protocolName: string, factors: RiskFactor[], riskLevel: string): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Add specific recommendations based on risk factors
    factors.forEach(factor => {
      if (factor.score < 6) {
        switch (factor.name) {
          case 'Smart Contract Security':
            recommendations.push('Consider reducing position size due to security concerns');
            break;
          case 'Total Value Locked':
            recommendations.push('Monitor liquidity closely - low TVL increases exit risk');
            break;
          case 'Team & Governance':
            recommendations.push('Stay updated on governance changes and team developments');
            break;
          case 'Community Trust':
            recommendations.push('Watch community sentiment and consider gradual position reduction');
            break;
          case 'Code Quality':
            recommendations.push('Monitor for code updates and security improvements');
            break;
        }
      }
    });

    if (riskLevel === 'high' || riskLevel === 'critical') {
      recommendations.push('Consider position size limits and regular rebalancing');
      recommendations.push('Set up automated alerts for significant protocol changes');
    }

    return recommendations;
  }

  // Generate portfolio-wide recommendations
  private async generatePortfolioRecommendations(
    overallScore: number,
    diversificationScore: number,
    concentrationRisk: number,
    positions: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (diversificationScore < 6) {
      recommendations.push('Increase diversification across protocols and asset types');
    }

    if (concentrationRisk > 7) {
      recommendations.push('Reduce concentration in single assets or protocols');
    }

    if (overallScore > 7) {
      recommendations.push('Consider increasing stablecoin allocation to reduce overall risk');
    }

    const stablecoinAllocation = positions
      .filter(p => p.symbol === 'USDC' || p.symbol === 'USDT')
      .reduce((sum, p) => sum + p.percentage, 0);

    if (stablecoinAllocation < 20) {
      recommendations.push('Consider adding stablecoin positions for portfolio stability');
    }

    return recommendations;
  }

  // Helper methods
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 8) return 'low';
    if (score >= 6) return 'medium';
    if (score >= 4) return 'high';
    return 'critical';
  }

  private extractProtocol(category: string): string {
    const protocolMap: { [key: string]: string } = {
      'staking': 'marinade',
      'lending': 'solend',
      'liquidity': 'orca',
      'yield_farming': 'raydium'
    };
    return protocolMap[category] || 'unknown';
  }

  private calculatePortfolioOverallScore(positions: any[], protocolRisks: ProtocolRisk[]): number {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    return positions.reduce((weightedSum, pos, index) => {
      const weight = pos.value / totalValue;
      const protocolScore = protocolRisks[index]?.overallScore || 5;
      return weightedSum + (weight * protocolScore);
    }, 0);
  }

  private calculateDiversificationScore(positions: any[]): number {
    const categoryCount = new Set(positions.map(p => p.category)).size;
    const maxCategories = 4; // staking, lending, liquidity, yield_farming
    
    const herfindahlIndex = positions.reduce((sum, pos) => {
      const weight = pos.percentage / 100;
      return sum + (weight * weight);
    }, 0);
    
    const diversificationIndex = (1 - herfindahlIndex) * 10;
    const categoryDiversity = (categoryCount / maxCategories) * 10;
    
    return (diversificationIndex + categoryDiversity) / 2;
  }

  private calculateLiquidityRisk(positions: any[]): number {
    return positions.reduce((sum, pos) => {
      const assetRisk = this.getAssetRiskMetrics(pos.symbol);
      const liquidityScore = (1 - assetRisk.liquidity) * 10;
      const weight = pos.percentage / 100;
      return sum + (liquidityScore * weight);
    }, 0);
  }

  private calculateConcentrationRisk(positions: any[]): number {
    const maxPosition = Math.max(...positions.map(p => p.percentage));
    
    if (maxPosition > 50) return 9;
    if (maxPosition > 40) return 7;
    if (maxPosition > 30) return 5;
    if (maxPosition > 20) return 3;
    return 1;
  }

  private calculateSmartContractRisk(protocolRisks: ProtocolRisk[]): number {
    const avgTechnicalRisk = protocolRisks.reduce((sum, risk) => {
      const technicalFactors = risk.factors.filter(f => f.category === 'technical');
      const avgTechnical = technicalFactors.reduce((s, f) => s + f.score, 0) / technicalFactors.length;
      return sum + avgTechnical;
    }, 0) / protocolRisks.length;
    
    return 10 - avgTechnicalRisk;
  }

  private calculateMarketRisk(positions: any[]): number {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    return positions.reduce((sum, pos) => {
      const assetRisk = this.getAssetRiskMetrics(pos.symbol);
      const weight = pos.value / totalValue;
      return sum + (assetRisk.volatility * weight * 10);
    }, 0);
  }

  private calculateRiskTrend(positions: any[]): 'increasing' | 'stable' | 'decreasing' {
    // Mock implementation - in reality, this would analyze historical data
    const highRiskPositions = positions.filter(p => p.risk === 'high').length;
    const totalPositions = positions.length;
    
    if (highRiskPositions / totalPositions > 0.5) return 'increasing';
    if (highRiskPositions / totalPositions < 0.2) return 'decreasing';
    return 'stable';
  }

  private getAssetVolatility(symbol: string): number {
    const riskMetrics = this.getAssetRiskMetrics(symbol);
    return riskMetrics.volatility;
  }
}

export const riskAssessmentService = new RiskAssessmentService();
export type { ProtocolRisk, PortfolioRisk, RiskFactor, AssetRisk }; 