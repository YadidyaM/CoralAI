import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, Brain, DollarSign, Eye, RefreshCw, Settings, Filter, Calendar, Download, Database } from 'lucide-react';
import { Keypair } from '@solana/web3.js';
import { blockchainTransactionTracker, PnLData, PortfolioSnapshot, Transaction } from '../services/blockchainTransactionTracker';
import { blockchainPortfolioAnalytics, PerformanceMetrics, RiskMetrics, BenchmarkComparison } from '../services/blockchainPortfolioAnalytics';
import { blockchainAIInsights, BlockchainAIInsightsReport, RebalancingRecommendation, PersonalizedRecommendation } from '../services/blockchainAIInsights';
import { useUserStore } from '../stores/userStore';
import BlockchainPerformanceBenchmarking from './BlockchainPerformanceBenchmarking';

interface BlockchainPortfolioDashboardProps {
  onSendMessage: (message: string) => void;
  userWallet?: Keypair; // Solana wallet for blockchain operations
}

const BlockchainPortfolioDashboard: React.FC<BlockchainPortfolioDashboardProps> = ({ onSendMessage, userWallet }) => {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'insights' | 'rebalancing' | 'blockchain'>('overview');
  const [timeFrame, setTimeFrame] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // State for blockchain data
  const [currentPnL, setCurrentPnL] = useState<Record<string, PnLData>>({});
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [aiReport, setAiReport] = useState<BlockchainAIInsightsReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [blockchainInfo, setBlockchainInfo] = useState<any>(null);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  useEffect(() => {
    if (user?.id && userWallet) {
      initializeBlockchainServices();
      loadDashboardData();
    }
  }, [user?.id, userWallet, timeFrame]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user?.id && userWallet) {
      interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, user?.id, userWallet, timeFrame]);

  const initializeBlockchainServices = async () => {
    if (!userWallet) return;
    
    try {
      // Set wallet for all blockchain services
      blockchainTransactionTracker.setUserWallet(userWallet);
      blockchainPortfolioAnalytics.setUserWallet(userWallet);
      blockchainAIInsights.setUserWallet(userWallet);
      
      // Get blockchain connection info
      const info = {
        transactionTracker: blockchainTransactionTracker.getBlockchainInfo(),
        portfolioAnalytics: blockchainPortfolioAnalytics.getBlockchainInfo(),
        aiInsights: blockchainAIInsights.getBlockchainInfo()
      };
      setBlockchainInfo(info);
      
      console.log('Blockchain services initialized:', info);
    } catch (error) {
      console.error('Failed to initialize blockchain services:', error);
      setError('Failed to initialize blockchain connection');
    }
  };

  const loadDashboardData = async () => {
    if (!user?.id || !userWallet) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Initialize blockchain transaction tracker
      await blockchainTransactionTracker.initialize(user.id);
      
      // Load all data from blockchain in parallel
      const [
        pnlData,
        summary,
        history,
        txHistory,
        performanceData,
        riskData,
        aiReportData
      ] = await Promise.all([
        Promise.resolve(blockchainTransactionTracker.getCurrentPnL()),
        Promise.resolve(blockchainTransactionTracker.getPortfolioSummary()),
        blockchainTransactionTracker.getPortfolioHistory(user.id, timeFrame),
        blockchainTransactionTracker.getTransactionHistory(user.id, 50),
        blockchainPortfolioAnalytics.calculatePerformanceMetrics(user.id, timeFrame),
        blockchainPortfolioAnalytics.calculateRiskMetrics(user.id, timeFrame),
        blockchainAIInsights.generateComprehensiveReport(user.id, timeFrame)
      ]);
      
      setCurrentPnL(pnlData);
      setPortfolioSummary(summary);
      setPortfolioHistory(history);
      setTransactions(txHistory);
      setPerformance(performanceData);
      setRisk(riskData);
      setAiReport(aiReportData);
      
    } catch (err) {
      setError('Failed to load data from Solana blockchain');
      console.error('Blockchain dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getColorForValue = (value: number, reversed: boolean = false) => {
    const positive = value > 0;
    if (reversed) {
      return positive ? 'text-red-500' : 'text-green-500';
    }
    return positive ? 'text-green-500' : 'text-red-500';
  };

  const preparePortfolioChart = () => {
    return portfolioHistory.map(snapshot => ({
      date: new Date(snapshot.timestamp).toLocaleDateString(),
      value: snapshot.totalValue,
      pnl: snapshot.totalPnL,
      pnlPercentage: snapshot.pnlPercentage
    }));
  };

  const prepareAssetAllocationChart = () => {
    return Object.values(currentPnL).map((asset, index) => ({
      name: asset.asset,
      value: asset.currentValue,
      percentage: portfolioSummary ? (asset.currentValue / portfolioSummary.totalValue) * 100 : 0,
      color: COLORS[index % COLORS.length]
    }));
  };

  const executeRebalancing = async (recommendation: RebalancingRecommendation) => {
    if (!userWallet) {
      onSendMessage('Wallet not connected for blockchain transactions');
      return;
    }

    try {
      // Create a blockchain transaction for the rebalancing action
      const transaction = {
        userId: user!.id,
        type: recommendation.action === 'buy' ? 'buy' as const : 'sell' as const,
        fromToken: recommendation.action === 'buy' ? 'USDC' : recommendation.asset,
        toToken: recommendation.action === 'buy' ? recommendation.asset : 'USDC',
        fromAmount: recommendation.action === 'buy' ? recommendation.amount : recommendation.amount,
        toAmount: recommendation.action === 'buy' ? recommendation.amount : recommendation.amount,
        price: 1,
        timestamp: Date.now(),
        txHash: `blockchain_rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gasUsed: recommendation.solanaSpecific?.gasEstimate || 0.01,
        gasCost: 0.05,
        status: 'confirmed' as const,
        exchange: recommendation.solanaSpecific?.recommendedDEX || 'Solana DEX',
        notes: `Blockchain rebalancing: ${recommendation.reasoning}`
      };

      await blockchainTransactionTracker.recordTransaction(transaction);
      onSendMessage(`✅ Executed blockchain rebalancing: ${recommendation.action} ${recommendation.asset} via ${recommendation.solanaSpecific?.recommendedDEX}`);
      
      // Reload data from blockchain
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to execute blockchain rebalancing:', error);
      onSendMessage(`❌ Failed to execute blockchain rebalancing: ${error}`);
    }
  };

  if (!userWallet) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-yellow-800">Solana wallet required for blockchain portfolio management</span>
            </div>
            <p className="text-yellow-700 mt-2">Please connect your Solana wallet to access on-chain portfolio data and execute blockchain transactions.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !portfolioSummary) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-lg text-gray-600">Loading from Solana blockchain...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry Blockchain Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Blockchain Portfolio Dashboard</h1>
                <p className="text-gray-600">Powered by Solana blockchain storage</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">Auto-refresh</label>
              </div>
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(Number(e.target.value) as 30 | 90 | 365)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
              </select>
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Blockchain</span>
              </button>
            </div>
          </div>

          {/* Blockchain Status */}
          {blockchainInfo && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Solana Blockchain Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-700">
                <div>
                  <p><strong>Connection:</strong> {blockchainInfo.transactionTracker.connection ? '✅ Connected' : '❌ Disconnected'}</p>
                  <p><strong>Transactions:</strong> {blockchainInfo.transactionTracker.transactionCount}</p>
                </div>
                <div>
                  <p><strong>Program ID:</strong> {blockchainInfo.portfolioAnalytics.programId?.toString().substring(0, 8)}...</p>
                  <p><strong>Wallet:</strong> {blockchainInfo.transactionTracker.hasWallet ? '✅ Connected' : '❌ Not set'}</p>
                </div>
                <div>
                  <p><strong>Snapshots:</strong> {blockchainInfo.transactionTracker.snapshotCount}</p>
                  <p><strong>Last Analysis:</strong> {blockchainInfo.aiInsights.lastAnalysisTime ? new Date(blockchainInfo.aiInsights.lastAnalysisTime).toLocaleTimeString() : 'Never'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Summary Cards */}
          {portfolioSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Value (On-Chain)</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(portfolioSummary.totalValue)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total P&L (Blockchain)</p>
                    <p className={`text-2xl font-bold ${getColorForValue(portfolioSummary.totalPnL)}`}>
                      {formatCurrency(portfolioSummary.totalPnL)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">P&L % (Verified)</p>
                    <p className={`text-2xl font-bold ${getColorForValue(portfolioSummary.pnlPercentage)}`}>
                      {formatPercentage(portfolioSummary.pnlPercentage / 100)}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Solana AI Score</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {aiReport?.overallScore || 'N/A'}
                    </p>
                    {aiReport?.onChainSignature && (
                      <p className="text-xs text-gray-500">TX: {aiReport.onChainSignature.substring(0, 8)}...</p>
                    )}
                  </div>
                  <Brain className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'transactions', label: 'Blockchain TXs', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'insights', label: 'Solana AI', icon: Brain },
              { id: 'rebalancing', label: 'Rebalancing', icon: Target },
              { id: 'blockchain', label: 'Blockchain Info', icon: Database }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Value Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Blockchain Portfolio Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={preparePortfolioChart()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(value as number), name]} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Portfolio Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Asset Allocation */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Solana Asset Allocation</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareAssetAllocationChart()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareAssetAllocationChart().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Value']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Performance Table */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana Asset Performance (Blockchain Verified)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P&L %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(currentPnL).map((asset) => (
                      <tr key={asset.asset}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {asset.asset}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(asset.currentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {asset.quantity.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(asset.averageBuyPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(asset.currentPrice)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getColorForValue(asset.totalPnL)}`}>
                          {formatCurrency(asset.totalPnL)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getColorForValue(asset.pnlPercentage)}`}>
                          {formatPercentage(asset.pnlPercentage / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Blockchain Transaction History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TX Hash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tx.type === 'buy' ? 'bg-green-100 text-green-800' :
                          tx.type === 'sell' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.fromAmount.toFixed(4)} {tx.fromToken}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.toAmount.toFixed(4)} {tx.toToken}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tx.fromAmount * tx.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {tx.txHash.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tx.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          tx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tx.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <BlockchainPerformanceBenchmarking 
            onSendMessage={onSendMessage} 
            userWallet={userWallet}
          />
        )}

        {activeTab === 'insights' && aiReport && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana AI Portfolio Summary</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{aiReport.summary}</p>
                {aiReport.onChainSignature && (
                  <p className="text-xs text-gray-500 mt-2">
                    Stored on blockchain: {aiReport.onChainSignature.substring(0, 16)}...
                  </p>
                )}
              </div>
            </div>

            {/* Solana Ecosystem Status */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana Ecosystem Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800">Staking Rewards</h4>
                  <p className="text-2xl font-bold text-green-600">{aiReport.solanaEcosystem.stakingRewards.toFixed(1)}%</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800">Validator Performance</h4>
                  <p className="text-lg font-semibold text-blue-600">{aiReport.solanaEcosystem.validatorPerformance}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800">DeFi TVL</h4>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(aiReport.solanaEcosystem.defiTVL)}</p>
                </div>
              </div>
            </div>

            {/* Risk Alerts */}
            {aiReport.riskAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  Solana Risk Alerts
                </h3>
                <div className="space-y-2">
                  {aiReport.riskAlerts.map((alert, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">{alert}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {aiReport.opportunities.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                  Solana DeFi Opportunities
                </h3>
                <div className="space-y-2">
                  {aiReport.opportunities.map((opportunity, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 text-sm">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalized Recommendations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana-Specific Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiReport.recommendations.map((rec) => (
                  <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>Category:</strong> {rec.category}</p>
                      <p><strong>Required SOL:</strong> {rec.solanaContext.requiredSOL.toFixed(4)}</p>
                      <p><strong>Estimated APY:</strong> {rec.solanaContext.estimatedAPY.toFixed(1)}%</p>
                      <p><strong>Time:</strong> {rec.timeRequired}</p>
                      <p><strong>Impact:</strong> {rec.estimatedImpact}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rebalancing' && aiReport && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana Blockchain Rebalancing</h3>
              <div className="space-y-4">
                {aiReport.rebalancing.map((rec) => (
                  <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{rec.asset}</h4>
                        <p className="text-sm text-gray-600">{rec.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          rec.urgency === 'high' ? 'bg-red-100 text-red-800' :
                          rec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.urgency.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500">Current</p>
                        <p className="font-medium">{formatPercentage(rec.currentAllocation)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Target</p>
                        <p className="font-medium">{formatPercentage(rec.targetAllocation)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Action</p>
                        <p className={`font-medium ${rec.action === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                          {rec.action.toUpperCase()} {formatCurrency(rec.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-3 mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Solana DEX Details</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <p><strong>DEX:</strong> {rec.solanaSpecific.recommendedDEX}</p>
                        <p><strong>Slippage:</strong> {rec.solanaSpecific.expectedSlippage.toFixed(2)}%</p>
                        <p><strong>Gas:</strong> {rec.solanaSpecific.gasEstimate.toFixed(4)} SOL</p>
                        <p><strong>Impact:</strong> {rec.solanaSpecific.priceImpact.toFixed(2)}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <p>Risk: {rec.riskLevel} | Confidence: {(rec.confidence * 100).toFixed(0)}%</p>
                        <p>Expected Impact: {rec.expectedImpact}</p>
                      </div>
                      <button
                        onClick={() => executeRebalancing(rec)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Execute on Blockchain
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blockchain' && blockchainInfo && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Solana Blockchain Connection Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Transaction Tracker</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Connection:</strong> {blockchainInfo.transactionTracker.connection ? '✅ Active' : '❌ Inactive'}</p>
                    <p><strong>Program ID:</strong> <code className="bg-gray-100 px-1 rounded">{blockchainInfo.transactionTracker.programId?.toString()}</code></p>
                    <p><strong>Initialized:</strong> {blockchainInfo.transactionTracker.isInitialized ? 'Yes' : 'No'}</p>
                    <p><strong>Transactions:</strong> {blockchainInfo.transactionTracker.transactionCount}</p>
                    <p><strong>Snapshots:</strong> {blockchainInfo.transactionTracker.snapshotCount}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">AI Insights</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Cache Duration:</strong> {blockchainInfo.aiInsights.cacheTime / 1000}s</p>
                    <p><strong>Last Analysis:</strong> {blockchainInfo.aiInsights.lastAnalysisTime ? new Date(blockchainInfo.aiInsights.lastAnalysisTime).toLocaleString() : 'Never'}</p>
                    <p><strong>Initialized:</strong> {blockchainInfo.aiInsights.isInitialized ? 'Yes' : 'No'}</p>
                    {aiReport?.onChainSignature && (
                      <p><strong>Last TX:</strong> <code className="bg-gray-100 px-1 rounded">{aiReport.onChainSignature.substring(0, 16)}...</code></p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainPortfolioDashboard; 