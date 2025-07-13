import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Shield, DollarSign, BarChart3, Calculator, Target, AlertTriangle, Brain, RefreshCw, PieChart, Activity, Coins } from 'lucide-react';
import { openaiService } from '../services/openaiService';
import { useAgentStore } from '../stores/agentStore';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { walletSyncService } from '../services/walletSync';

interface PortfolioPosition {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  percentage: number;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  category: 'staking' | 'lending' | 'liquidity' | 'yield_farming';
}

interface YieldOpportunity {
  id: string;
  protocol: string;
  name: string;
  apy: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  category: 'staking' | 'lending' | 'liquidity' | 'yield_farming';
  minDeposit: number;
  lockPeriod: number;
  impermanentLoss: number;
  aiScore: number;
  description: string;
}

interface LiquidityPool {
  id: string;
  tokenA: string;
  tokenB: string;
  apy: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
  impermanentLoss: number;
  priceImpact: number;
  liquidity: number;
}

interface RebalanceRecommendation {
  type: 'buy' | 'sell' | 'rebalance';
  asset: string;
  currentPercentage: number;
  targetPercentage: number;
  amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedReturn: number;
  riskAdjustment: number;
}

export const EnhancedDeFiInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rebalance' | 'yield' | 'liquidity' | 'risk'>('overview');
  const [portfolioData, setPortfolioData] = useState<PortfolioPosition[]>([]);
  const [yieldOpportunities, setYieldOpportunities] = useState<YieldOpportunity[]>([]);
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [rebalanceRecommendations, setRebalanceRecommendations] = useState<RebalanceRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [yieldProjections, setYieldProjections] = useState<any[]>([]);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState(false);
  
  const { currentUser } = useSupabaseUserStore();
  const { addMessage, setAgentStatus } = useAgentStore();

  // Mock portfolio data - in real implementation, this would come from APIs
  const mockPortfolio: PortfolioPosition[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      balance: 15.42,
      value: 1235.60,
      percentage: 45.8,
      apy: 6.8,
      risk: 'medium',
      category: 'staking'
    },
    {
      symbol: 'mSOL',
      name: 'Marinade Staked SOL',
      balance: 8.33,
      value: 667.20,
      percentage: 24.7,
      apy: 7.2,
      risk: 'low',
      category: 'staking'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: 450.00,
      value: 450.00,
      percentage: 16.7,
      apy: 4.5,
      risk: 'low',
      category: 'lending'
    },
    {
      symbol: 'RAY',
      name: 'Raydium',
      balance: 125.0,
      value: 348.75,
      percentage: 12.8,
      apy: 18.7,
      risk: 'high',
      category: 'yield_farming'
    }
  ];

  const mockYieldOpportunities: YieldOpportunity[] = [
    {
      id: 'marinade-sol',
      protocol: 'Marinade',
      name: 'Liquid Staking (mSOL)',
      apy: 7.2,
      tvl: 1200000000,
      risk: 'low',
      category: 'staking',
      minDeposit: 0.1,
      lockPeriod: 0,
      impermanentLoss: 0,
      aiScore: 9.2,
      description: 'Liquid staking with instant liquidity and no lock period'
    },
    {
      id: 'orca-sol-usdc',
      protocol: 'Orca',
      name: 'SOL/USDC Liquidity Pool',
      apy: 12.4,
      tvl: 45000000,
      risk: 'medium',
      category: 'liquidity',
      minDeposit: 1.0,
      lockPeriod: 0,
      impermanentLoss: 5.2,
      aiScore: 8.1,
      description: 'Concentrated liquidity with automated market making'
    },
    {
      id: 'raydium-ray-sol',
      protocol: 'Raydium',
      name: 'RAY/SOL Yield Farm',
      apy: 18.7,
      tvl: 23000000,
      risk: 'high',
      category: 'yield_farming',
      minDeposit: 0.5,
      lockPeriod: 7,
      impermanentLoss: 12.3,
      aiScore: 7.4,
      description: 'High yield farming with additional RAY rewards'
    },
    {
      id: 'solend-usdc',
      protocol: 'Solend',
      name: 'USDC Lending',
      apy: 4.8,
      tvl: 78000000,
      risk: 'low',
      category: 'lending',
      minDeposit: 10.0,
      lockPeriod: 0,
      impermanentLoss: 0,
      aiScore: 8.9,
      description: 'Secure lending with variable APY and instant withdrawal'
    }
  ];

  const mockLiquidityPools: LiquidityPool[] = [
    {
      id: 'orca-sol-usdc',
      tokenA: 'SOL',
      tokenB: 'USDC',
      apy: 12.4,
      tvl: 45000000,
      volume24h: 2300000,
      fees24h: 6900,
      impermanentLoss: 5.2,
      priceImpact: 0.15,
      liquidity: 45000000
    },
    {
      id: 'raydium-ray-sol',
      tokenA: 'RAY',
      tokenB: 'SOL',
      apy: 18.7,
      tvl: 23000000,
      volume24h: 1200000,
      fees24h: 3600,
      impermanentLoss: 12.3,
      priceImpact: 0.28,
      liquidity: 23000000
    },
    {
      id: 'orca-msol-sol',
      tokenA: 'mSOL',
      tokenB: 'SOL',
      apy: 8.9,
      tvl: 67000000,
      volume24h: 890000,
      fees24h: 2670,
      impermanentLoss: 2.1,
      priceImpact: 0.08,
      liquidity: 67000000
    }
  ];

  useEffect(() => {
    loadPortfolioData();
    generateAIInsights();
  }, [currentUser]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // In real implementation, fetch from multiple DeFi protocols
      setPortfolioData(mockPortfolio);
      setYieldOpportunities(mockYieldOpportunities);
      setLiquidityPools(mockLiquidityPools);
      
      const totalValue = mockPortfolio.reduce((sum, pos) => sum + pos.value, 0);
      setPortfolioValue(totalValue);
      
      // Calculate risk score
      const avgRisk = mockPortfolio.reduce((sum, pos) => {
        const riskWeight = pos.risk === 'low' ? 1 : pos.risk === 'medium' ? 2 : 3;
        return sum + (riskWeight * pos.percentage / 100);
      }, 0);
      setRiskScore(avgRisk);
      
      await generateRebalanceRecommendations();
      await calculateYieldProjections();
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async () => {
    try {
      const prompt = `Based on a DeFi portfolio with total value $${portfolioValue.toFixed(2)}, 
      analyze the current market conditions and provide insights on:
      1. Market trends affecting DeFi yields
      2. Recommended portfolio adjustments
      3. Risk mitigation strategies
      4. Emerging opportunities
      Keep it concise and actionable.`;
      
      const insights = await openaiService.getChatResponse(prompt);
      setAiInsights(insights);
    } catch (error) {
      setAiInsights('AI insights temporarily unavailable. Using default risk assessment.');
    }
  };

  const generateRebalanceRecommendations = async () => {
    // Advanced AI-powered rebalancing logic
    const recommendations: RebalanceRecommendation[] = [];
    
    // Example: If SOL is over-allocated
    if (portfolioData.find(p => p.symbol === 'SOL')?.percentage > 40) {
      recommendations.push({
        type: 'sell',
        asset: 'SOL',
        currentPercentage: 45.8,
        targetPercentage: 35.0,
        amount: 2.5,
        reason: 'Reduce concentration risk by diversifying into stablecoins',
        priority: 'medium',
        expectedReturn: 8.2,
        riskAdjustment: -0.3
      });
    }
    
    // Example: Recommend yield farming if risk tolerance allows
    if (riskScore < 2.5) {
      recommendations.push({
        type: 'buy',
        asset: 'RAY',
        currentPercentage: 12.8,
        targetPercentage: 20.0,
        amount: 1.8,
        reason: 'Increase yield through farming while maintaining acceptable risk',
        priority: 'low',
        expectedReturn: 18.7,
        riskAdjustment: 0.2
      });
    }
    
    setRebalanceRecommendations(recommendations);
  };

  const calculateYieldProjections = async () => {
    const timeframes = [1, 3, 6, 12, 24]; // months
    const projections = timeframes.map(months => {
      const compoundFrequency = 365; // daily compounding
      const totalYield = portfolioData.reduce((sum, pos) => {
        const rate = pos.apy / 100;
        const compoundedValue = pos.value * Math.pow(1 + rate / compoundFrequency, compoundFrequency * months / 12);
        return sum + compoundedValue;
      }, 0);
      
      return {
        months,
        value: totalYield,
        growth: totalYield - portfolioValue,
        percentage: ((totalYield - portfolioValue) / portfolioValue) * 100
      };
    });
    
    setYieldProjections(projections);
  };

  const calculateImpermanentLoss = (price1Initial: number, price2Initial: number, price1Final: number, price2Final: number) => {
    const ratio = (price1Final / price1Initial) / (price2Final / price2Initial);
    const impermanentLoss = (2 * Math.sqrt(ratio) / (1 + ratio)) - 1;
    return Math.abs(impermanentLoss) * 100;
  };

  const executeRebalance = async (recommendation: RebalanceRecommendation) => {
    setLoading(true);
    addMessage({
      agentId: 'defi-scout',
      content: `Executing rebalance: ${recommendation.type} ${recommendation.amount} ${recommendation.asset}`,
      type: 'task'
    });
    
    try {
      // Simulate rebalancing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addMessage({
        agentId: 'defi-scout',
        content: `Successfully executed rebalance for ${recommendation.asset}`,
        type: 'completion'
      });
      
      // Refresh portfolio data
      await loadPortfolioData();
    } catch (error) {
      addMessage({
        agentId: 'defi-scout',
        content: `Failed to execute rebalance: ${error}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-xl border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm">Total Value</p>
              <p className="text-2xl font-bold text-white">${portfolioValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-6 rounded-xl border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm">Avg APY</p>
              <p className="text-2xl font-bold text-white">
                {(portfolioData.reduce((sum, p) => sum + p.apy * p.percentage / 100, 0)).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-900 to-orange-800 p-6 rounded-xl border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-300 text-sm">Risk Score</p>
              <p className="text-2xl font-bold text-white">{riskScore.toFixed(1)}/5</p>
            </div>
            <Shield className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-900 to-purple-800 p-6 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm">AI Score</p>
              <p className="text-2xl font-bold text-white">8.4/10</p>
            </div>
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-xl border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Portfolio Insights
          </h3>
          <p className="text-gray-300 whitespace-pre-line">{aiInsights}</p>
        </div>
      )}

      {/* Current Positions */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Current Positions</h3>
        <div className="space-y-3">
          {portfolioData.map((position, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{position.symbol[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-white">{position.name}</p>
                  <p className="text-sm text-gray-400">{position.balance.toFixed(2)} {position.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">${position.value.toFixed(2)}</p>
                <p className="text-sm text-green-400">{position.apy}% APY</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRebalance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Portfolio Rebalancing</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">Auto-Rebalance</label>
          <input
            type="checkbox"
            checked={autoRebalanceEnabled}
            onChange={(e) => setAutoRebalanceEnabled(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
        </div>
      </div>

      {rebalanceRecommendations.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="text-lg font-medium text-white mb-4">AI Recommendations</h4>
          <div className="space-y-4">
            {rebalanceRecommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      rec.priority === 'high' ? 'bg-red-500' : 
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="font-medium text-white capitalize">{rec.type} {rec.asset}</span>
                  </div>
                  <button
                    onClick={() => executeRebalance(rec)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Execute
                  </button>
                </div>
                <p className="text-gray-300 text-sm mb-2">{rec.reason}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Current: </span>
                    <span className="text-white">{rec.currentPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Target: </span>
                    <span className="text-white">{rec.targetPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expected Return: </span>
                    <span className="text-green-400">{rec.expectedReturn}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Risk Adjustment: </span>
                    <span className={rec.riskAdjustment > 0 ? 'text-yellow-400' : 'text-green-400'}>
                      {rec.riskAdjustment > 0 ? '+' : ''}{rec.riskAdjustment}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderYieldOptimization = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Yield Optimization</h3>
      
      {/* Yield Projections */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="text-lg font-medium text-white mb-4">Compound Interest Projections</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {yieldProjections.map((proj, index) => (
            <div key={index} className="text-center p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">{proj.months} Month{proj.months > 1 ? 's' : ''}</p>
              <p className="text-xl font-bold text-white">${proj.value?.toFixed(0)}</p>
              <p className="text-green-400 text-sm">+{proj.percentage?.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Yield Opportunities */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="text-lg font-medium text-white mb-4">Best Yield Opportunities</h4>
        <div className="space-y-3">
          {yieldOpportunities.map((opp, index) => (
            <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{opp.protocol[0]}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{opp.name}</p>
                    <p className="text-sm text-gray-400">{opp.protocol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-400">{opp.apy}% APY</p>
                  <p className="text-sm text-gray-400">AI Score: {opp.aiScore}/10</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{opp.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">TVL: </span>
                  <span className="text-white">${(opp.tvl / 1000000).toFixed(1)}M</span>
                </div>
                <div>
                  <span className="text-gray-400">Min Deposit: </span>
                  <span className="text-white">{opp.minDeposit} SOL</span>
                </div>
                <div>
                  <span className="text-gray-400">Lock Period: </span>
                  <span className="text-white">{opp.lockPeriod} days</span>
                </div>
                <div>
                  <span className="text-gray-400">IL Risk: </span>
                  <span className="text-yellow-400">{opp.impermanentLoss}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLiquidityAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">Liquidity Pool Analytics</h3>
      
      <div className="space-y-4">
        {liquidityPools.map((pool, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{pool.tokenA}</span>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{pool.tokenB}</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-white">{pool.tokenA}/{pool.tokenB}</p>
                  <p className="text-sm text-gray-400">Pool ID: {pool.id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-400">{pool.apy}% APY</p>
                <p className="text-sm text-gray-400">TVL: ${(pool.tvl / 1000000).toFixed(1)}M</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-white font-bold">${(pool.volume24h / 1000000).toFixed(1)}M</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">24h Fees</p>
                <p className="text-white font-bold">${pool.fees24h.toFixed(0)}</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Price Impact</p>
                <p className="text-white font-bold">{pool.priceImpact}%</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">IL Risk</p>
                <p className="text-yellow-400 font-bold">{pool.impermanentLoss}%</p>
              </div>
            </div>
            
            {/* Impermanent Loss Calculator */}
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h5 className="text-white font-medium mb-2">Impermanent Loss Calculator</h5>
              <p className="text-gray-300 text-sm">
                If {pool.tokenA} increases by 50% relative to {pool.tokenB}, 
                your impermanent loss would be approximately {calculateImpermanentLoss(1, 1, 1.5, 1).toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRiskAssessment = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white">AI Risk Assessment</h3>
      
      {/* Overall Risk Score */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="text-lg font-medium text-white mb-4">Portfolio Risk Analysis</h4>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              riskScore <= 2 ? 'bg-green-500' : riskScore <= 3.5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              <span className="text-white text-xl font-bold">{riskScore.toFixed(1)}</span>
            </div>
            <div>
              <p className="text-white font-medium">Overall Risk Score</p>
              <p className="text-gray-400 text-sm">
                {riskScore <= 2 ? 'Low Risk' : riskScore <= 3.5 ? 'Moderate Risk' : 'High Risk'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-sm">Smart Contract Risk</p>
            <p className="text-white font-bold">Low</p>
            <p className="text-green-400 text-sm">All protocols audited</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-sm">Liquidity Risk</p>
            <p className="text-white font-bold">Medium</p>
            <p className="text-yellow-400 text-sm">Adequate exit liquidity</p>
          </div>
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-sm">Market Risk</p>
            <p className="text-white font-bold">High</p>
            <p className="text-red-400 text-sm">Volatile asset exposure</p>
          </div>
        </div>
      </div>

      {/* Risk Breakdown by Asset */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="text-lg font-medium text-white mb-4">Risk Breakdown by Asset</h4>
        <div className="space-y-3">
          {portfolioData.map((position, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{position.symbol[0]}</span>
                </div>
                <div>
                  <p className="font-medium text-white">{position.name}</p>
                  <p className="text-sm text-gray-400">{position.percentage}% of portfolio</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-sm ${
                  position.risk === 'low' ? 'bg-green-500/20 text-green-400' :
                  position.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {position.risk.toUpperCase()} RISK
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'rebalance', label: 'Rebalance', icon: RefreshCw },
    { id: 'yield', label: 'Yield Optimization', icon: Calculator },
    { id: 'liquidity', label: 'Liquidity Analytics', icon: Activity },
    { id: 'risk', label: 'Risk Assessment', icon: Shield }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Enhanced DeFi Dashboard</h1>
        <p className="text-gray-400">Advanced portfolio management with AI-powered insights</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-gray-300">Loading portfolio data...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'rebalance' && renderRebalance()}
            {activeTab === 'yield' && renderYieldOptimization()}
            {activeTab === 'liquidity' && renderLiquidityAnalytics()}
            {activeTab === 'risk' && renderRiskAssessment()}
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedDeFiInterface; 