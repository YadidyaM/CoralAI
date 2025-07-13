import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { RefreshCw, Target, TrendingUp, AlertTriangle, CheckCircle, Clock, Brain, Settings, Play, Pause, Zap, BarChart3, Percent } from 'lucide-react';
import { openaiService } from '../services/openaiService';
import { riskAssessmentService } from '../services/riskAssessment';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { useAgentStore } from '../stores/agentStore';

interface PortfolioPosition {
  symbol: string;
  name: string;
  currentValue: number;
  currentPercentage: number;
  targetPercentage: number;
  deviation: number;
  riskLevel: 'low' | 'medium' | 'high';
  category: 'staking' | 'lending' | 'liquidity' | 'yield_farming' | 'stable';
  apy: number;
  volatility: number;
  correlation: number;
  liquidityScore: number;
}

interface RebalanceAction {
  id: string;
  type: 'buy' | 'sell' | 'swap';
  fromAsset?: string;
  toAsset: string;
  amount: number;
  value: number;
  currentPercentage: number;
  targetPercentage: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  expectedImpact: {
    risk: number;
    return: number;
    diversification: number;
  };
  executionCost: number;
  timeEstimate: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

interface RebalanceStrategy {
  id: string;
  name: string;
  description: string;
  type: 'conservative' | 'balanced' | 'aggressive';
  riskTolerance: number;
  rebalanceThreshold: number;
  maxAllocation: number;
  minAllocation: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  autoExecute: boolean;
  constraints: {
    maxSinglePosition: number;
    minStableAllocation: number;
    maxRiskAssets: number;
  };
}

interface BacktestResult {
  period: string;
  returns: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  performance: Array<{
    date: string;
    value: number;
    benchmark: number;
  }>;
}

export const PortfolioRebalancer: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [rebalanceActions, setRebalanceActions] = useState<RebalanceAction[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<RebalanceStrategy | null>(null);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [rebalanceHistory, setRebalanceHistory] = useState<any[]>([]);
  const [currentRisk, setCurrentRisk] = useState(0);
  const [targetRisk, setTargetRisk] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'strategy' | 'backtest' | 'history'>('overview');

  const { currentUser } = useSupabaseUserStore();
  const { addMessage, setAgentStatus } = useAgentStore();

  // Mock portfolio data
  const mockPortfolio: PortfolioPosition[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      currentValue: 1235.60,
      currentPercentage: 45.8,
      targetPercentage: 35.0,
      deviation: -10.8,
      riskLevel: 'medium',
      category: 'staking',
      apy: 6.8,
      volatility: 0.68,
      correlation: 0.3,
      liquidityScore: 0.95
    },
    {
      symbol: 'mSOL',
      name: 'Marinade Staked SOL',
      currentValue: 667.20,
      currentPercentage: 24.7,
      targetPercentage: 25.0,
      deviation: 0.3,
      riskLevel: 'low',
      category: 'staking',
      apy: 7.2,
      volatility: 0.65,
      correlation: 0.95,
      liquidityScore: 0.85
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      currentValue: 450.00,
      currentPercentage: 16.7,
      targetPercentage: 25.0,
      deviation: 8.3,
      riskLevel: 'low',
      category: 'stable',
      apy: 4.5,
      volatility: 0.02,
      correlation: 0.1,
      liquidityScore: 0.99
    },
    {
      symbol: 'RAY',
      name: 'Raydium',
      currentValue: 348.75,
      currentPercentage: 12.8,
      targetPercentage: 15.0,
      deviation: 2.2,
      riskLevel: 'high',
      category: 'yield_farming',
      apy: 18.7,
      volatility: 0.89,
      correlation: 0.85,
      liquidityScore: 0.65
    }
  ];

  const rebalanceStrategies: RebalanceStrategy[] = [
    {
      id: 'conservative',
      name: 'Conservative Growth',
      description: 'Low risk strategy focusing on stablecoins and liquid staking',
      type: 'conservative',
      riskTolerance: 3,
      rebalanceThreshold: 3,
      maxAllocation: 40,
      minAllocation: 5,
      rebalanceFrequency: 'monthly',
      autoExecute: false,
      constraints: {
        maxSinglePosition: 40,
        minStableAllocation: 30,
        maxRiskAssets: 20
      }
    },
    {
      id: 'balanced',
      name: 'Balanced Optimization',
      description: 'Moderate risk with diversified DeFi exposure',
      type: 'balanced',
      riskTolerance: 5,
      rebalanceThreshold: 5,
      maxAllocation: 35,
      minAllocation: 5,
      rebalanceFrequency: 'weekly',
      autoExecute: true,
      constraints: {
        maxSinglePosition: 35,
        minStableAllocation: 20,
        maxRiskAssets: 40
      }
    },
    {
      id: 'aggressive',
      name: 'Aggressive Growth',
      description: 'High risk, high reward strategy with maximum DeFi exposure',
      type: 'aggressive',
      riskTolerance: 8,
      rebalanceThreshold: 8,
      maxAllocation: 50,
      minAllocation: 0,
      rebalanceFrequency: 'daily',
      autoExecute: true,
      constraints: {
        maxSinglePosition: 50,
        minStableAllocation: 10,
        maxRiskAssets: 70
      }
    }
  ];

  useEffect(() => {
    loadPortfolioData();
    setSelectedStrategy(rebalanceStrategies[1]); // Default to balanced
  }, []);

  useEffect(() => {
    if (portfolio.length > 0) {
      generateRebalanceActions();
      generateAIInsights();
      calculateRiskMetrics();
    }
  }, [portfolio, selectedStrategy]);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // In real implementation, fetch from walletSyncService
      setPortfolio(mockPortfolio);
      
      // Load rebalance history
      setRebalanceHistory([
        {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          actions: 2,
          improvement: 0.8,
          reason: 'Quarterly rebalancing'
        },
        {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          actions: 4,
          improvement: 1.2,
          reason: 'Market volatility adjustment'
        }
      ]);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRebalanceActions = () => {
    if (!selectedStrategy) return;

    const actions: RebalanceAction[] = [];
    const totalValue = portfolio.reduce((sum, pos) => sum + pos.currentValue, 0);

    portfolio.forEach(position => {
      const deviation = Math.abs(position.deviation);
      if (deviation > selectedStrategy.rebalanceThreshold) {
        const actionAmount = (position.deviation / 100) * totalValue;
        
        const action: RebalanceAction = {
          id: `action-${position.symbol}-${Date.now()}`,
          type: actionAmount > 0 ? 'buy' : 'sell',
          toAsset: position.symbol,
          amount: Math.abs(actionAmount),
          value: Math.abs(actionAmount),
          currentPercentage: position.currentPercentage,
          targetPercentage: position.targetPercentage,
          priority: deviation > 10 ? 'high' : deviation > 5 ? 'medium' : 'low',
          reason: `Rebalance ${position.symbol} from ${position.currentPercentage.toFixed(1)}% to ${position.targetPercentage.toFixed(1)}%`,
          expectedImpact: {
            risk: (position.riskLevel === 'high' ? -0.2 : 0.1) * Math.abs(actionAmount / totalValue),
            return: position.apy * Math.abs(actionAmount / totalValue) / 100,
            diversification: 0.05 * Math.abs(actionAmount / totalValue)
          },
          executionCost: Math.abs(actionAmount) * 0.003, // 0.3% fee
          timeEstimate: 2, // 2 minutes
          status: 'pending'
        };

        actions.push(action);
      }
    });

    setRebalanceActions(actions);
  };

  const generateAIInsights = async () => {
    if (!selectedStrategy) return;

    try {
      const prompt = `Analyze this DeFi portfolio rebalancing scenario:

Current Portfolio:
${portfolio.map(p => `${p.symbol}: ${p.currentPercentage.toFixed(1)}% (Target: ${p.targetPercentage.toFixed(1)}%)`).join('\n')}

Strategy: ${selectedStrategy.name}
Risk Tolerance: ${selectedStrategy.riskTolerance}/10
Rebalance Threshold: ${selectedStrategy.rebalanceThreshold}%

Provide insights on:
1. Current portfolio health
2. Rebalancing urgency
3. Risk assessment
4. Market timing considerations
5. Optimization opportunities

Keep response under 200 words.`;

      const insights = await openaiService.getChatResponse(prompt);
      setAiInsights(insights);
    } catch (error) {
      setAiInsights('AI insights temporarily unavailable. Portfolio shows moderate deviation from targets with manageable risk levels.');
    }
  };

  const calculateRiskMetrics = () => {
    const currentRisk = portfolio.reduce((sum, pos) => {
      const riskWeight = pos.riskLevel === 'low' ? 1 : pos.riskLevel === 'medium' ? 2 : 3;
      return sum + (riskWeight * pos.currentPercentage / 100);
    }, 0);

    const targetRisk = portfolio.reduce((sum, pos) => {
      const riskWeight = pos.riskLevel === 'low' ? 1 : pos.riskLevel === 'medium' ? 2 : 3;
      return sum + (riskWeight * pos.targetPercentage / 100);
    }, 0);

    setCurrentRisk(currentRisk);
    setTargetRisk(targetRisk);
  };

  const executeRebalance = async (actionId: string) => {
    const action = rebalanceActions.find(a => a.id === actionId);
    if (!action) return;

    setLoading(true);
    setAgentStatus('defi-scout', 'processing');

    addMessage({
      agentId: 'defi-scout',
      content: `Executing rebalance: ${action.reason}`,
      type: 'task'
    });

    try {
      // Update action status
      setRebalanceActions(prev =>
        prev.map(a => a.id === actionId ? { ...a, status: 'executing' } : a)
      );

      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Update portfolio and action status
      setRebalanceActions(prev =>
        prev.map(a => a.id === actionId ? { ...a, status: 'completed' } : a)
      );

      addMessage({
        agentId: 'defi-scout',
        content: `Successfully executed rebalance for ${action.toAsset}`,
        type: 'completion'
      });

      // Refresh portfolio data
      await loadPortfolioData();
    } catch (error) {
      setRebalanceActions(prev =>
        prev.map(a => a.id === actionId ? { ...a, status: 'failed' } : a)
      );

      addMessage({
        agentId: 'defi-scout',
        content: `Failed to execute rebalance: ${error}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
      setAgentStatus('defi-scout', 'idle');
    }
  };

  const executeAllRebalances = async () => {
    const pendingActions = rebalanceActions.filter(a => a.status === 'pending');
    
    for (const action of pendingActions) {
      await executeRebalance(action.id);
    }
  };

  const runBacktest = async (strategy: RebalanceStrategy) => {
    setLoading(true);
    
    try {
      // Simulate backtest results
      const mockResult: BacktestResult = {
        period: '1 Year',
        returns: 24.8,
        volatility: 12.5,
        sharpeRatio: 1.98,
        maxDrawdown: -8.3,
        winRate: 68.5,
        totalTrades: 24,
        performance: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(Date.now() - (364 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 1000 + (i * 0.5) + Math.sin(i * 0.1) * 50,
          benchmark: 1000 + (i * 0.3) + Math.sin(i * 0.08) * 30
        }))
      };

      setBacktestResults(mockResult);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const portfolioChartData = portfolio.map(pos => ({
    name: pos.symbol,
    current: pos.currentPercentage,
    target: pos.targetPercentage,
    value: pos.currentValue,
    color: pos.riskLevel === 'low' ? '#10B981' : pos.riskLevel === 'medium' ? '#F59E0B' : '#EF4444'
  }));

  const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Total Value</p>
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${portfolio.reduce((sum, pos) => sum + pos.currentValue, 0).toFixed(2)}
          </p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Current Risk</p>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-white">{currentRisk.toFixed(1)}/10</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Rebalance Actions</p>
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{rebalanceActions.length}</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Auto Rebalance</p>
            <Settings className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${autoRebalanceEnabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <p className="text-white text-sm">{autoRebalanceEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </div>

      {/* Portfolio Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Current vs Target Allocation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="current"
                  label={({ name, current }) => `${name}: ${current.toFixed(1)}%`}
                >
                  {portfolioChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Allocation Deviation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portfolioChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="current" fill="#8B5CF6" name="Current %" />
                <Bar dataKey="target" fill="#06B6D4" name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portfolio Positions */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Positions</h3>
        <div className="space-y-3">
          {portfolio.map((position, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{position.symbol}</span>
                </div>
                <div>
                  <p className="font-medium text-white">{position.name}</p>
                  <p className="text-sm text-gray-400">{position.category} • {position.apy}% APY</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-white font-bold">${position.currentValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-400">{position.currentPercentage.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Target: {position.targetPercentage.toFixed(1)}%</p>
                  <p className={`text-sm font-medium ${
                    Math.abs(position.deviation) > 5 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {position.deviation > 0 ? '+' : ''}{position.deviation.toFixed(1)}%
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs ${
                  position.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                  position.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {position.riskLevel.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-6 rounded-lg border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Rebalancing Insights
          </h3>
          <p className="text-gray-300 whitespace-pre-line">{aiInsights}</p>
        </div>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Rebalancing Actions</h3>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={executeAllRebalances}
            disabled={loading || rebalanceActions.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Execute All
          </motion.button>
        </div>
      </div>

      {rebalanceActions.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-400">Portfolio is perfectly balanced! No rebalancing needed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rebalanceActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 p-6 rounded-lg border border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    action.priority === 'high' ? 'bg-red-500' :
                    action.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium text-white">{action.reason}</p>
                    <p className="text-sm text-gray-400">
                      {action.type.toUpperCase()} {action.amount.toFixed(2)} {action.toAsset}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white font-bold">${action.value.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">~{action.timeEstimate}min</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => executeRebalance(action.id)}
                    disabled={loading || action.status !== 'pending'}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      action.status === 'pending' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : action.status === 'executing'
                        ? 'bg-yellow-600 text-white'
                        : action.status === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {action.status === 'pending' && <Play className="w-4 h-4" />}
                    {action.status === 'executing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {action.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                    {action.status === 'failed' && <AlertTriangle className="w-4 h-4" />}
                    {action.status === 'pending' ? 'Execute' : action.status}
                  </motion.button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Risk Impact</p>
                  <p className={`font-bold ${action.expectedImpact.risk < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {action.expectedImpact.risk > 0 ? '+' : ''}{(action.expectedImpact.risk * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Return Impact</p>
                  <p className="text-green-400 font-bold">+{(action.expectedImpact.return * 100).toFixed(2)}%</p>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-gray-400">Execution Cost</p>
                  <p className="text-white font-bold">${action.executionCost.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'actions', label: 'Actions', icon: RefreshCw },
    { id: 'strategy', label: 'Strategy', icon: Target },
    { id: 'backtest', label: 'Backtest', icon: TrendingUp },
    { id: 'history', label: 'History', icon: Clock }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Portfolio Rebalancer</h1>
        <p className="text-gray-400">AI-powered portfolio optimization with automated rebalancing</p>
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
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="text-gray-300">Processing portfolio optimization...</span>
            </div>
          </div>
        )}
        
        {!loading && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'actions' && renderActions()}
            {activeTab === 'strategy' && (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Strategy configuration coming soon...</p>
              </div>
            )}
            {activeTab === 'backtest' && (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Backtesting results coming soon...</p>
              </div>
            )}
            {activeTab === 'history' && (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Rebalancing history coming soon...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PortfolioRebalancer; 