import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, Brain, DollarSign, Eye, RefreshCw, Settings, Filter, Calendar, Download } from 'lucide-react';
import { transactionTracker, PnLData, PortfolioSnapshot, Transaction } from '../services/transactionTracker';
import { portfolioAnalytics, PerformanceMetrics, RiskMetrics, BenchmarkComparison } from '../services/portfolioAnalytics';
import { aiInsights, AIInsightsReport, RebalancingRecommendation, PersonalizedRecommendation } from '../services/aiInsights';
import { useUserStore } from '../stores/userStore';
import PerformanceBenchmarking from './PerformanceBenchmarking';

interface PortfolioDashboardProps {
  onSendMessage: (message: string) => void;
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ onSendMessage }) => {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'insights' | 'rebalancing'>('overview');
  const [timeFrame, setTimeFrame] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // State for data
  const [currentPnL, setCurrentPnL] = useState<Record<string, PnLData>>({});
  const [portfolioSummary, setPortfolioSummary] = useState<any>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [aiReport, setAiReport] = useState<AIInsightsReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id, timeFrame]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user?.id) {
      interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, user?.id, timeFrame]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Initialize transaction tracker
      await transactionTracker.initialize(user.id);
      
      // Load all data in parallel
      const [
        pnlData,
        summary,
        history,
        txHistory,
        performanceData,
        riskData,
        aiReportData
      ] = await Promise.all([
        Promise.resolve(transactionTracker.getCurrentPnL()),
        Promise.resolve(transactionTracker.getPortfolioSummary()),
        transactionTracker.getPortfolioHistory(user.id, timeFrame),
        transactionTracker.getTransactionHistory(user.id, 50),
        portfolioAnalytics.calculatePerformanceMetrics(user.id, timeFrame),
        portfolioAnalytics.calculateRiskMetrics(user.id, timeFrame),
        aiInsights.generateComprehensiveReport(user.id, timeFrame)
      ]);
      
      setCurrentPnL(pnlData);
      setPortfolioSummary(summary);
      setPortfolioHistory(history);
      setTransactions(txHistory);
      setPerformance(performanceData);
      setRisk(riskData);
      setAiReport(aiReportData);
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard loading error:', err);
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

  const preparePerformanceChart = () => {
    return Object.values(currentPnL).map(asset => ({
      asset: asset.asset,
      return: asset.pnlPercentage,
      value: asset.currentValue
    }));
  };

  const executeRebalancing = async (recommendation: RebalancingRecommendation) => {
    try {
      // Create a mock transaction for the rebalancing action
      const transaction = {
        userId: user!.id,
        type: recommendation.action === 'buy' ? 'buy' as const : 'sell' as const,
        fromToken: recommendation.action === 'buy' ? 'USDC' : recommendation.asset,
        toToken: recommendation.action === 'buy' ? recommendation.asset : 'USDC',
        fromAmount: recommendation.action === 'buy' ? recommendation.amount : recommendation.amount,
        toAmount: recommendation.action === 'buy' ? recommendation.amount : recommendation.amount,
        price: 1,
        timestamp: Date.now(),
        txHash: `rebalance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gasUsed: 0.01,
        gasCost: 0.05,
        status: 'confirmed' as const,
        exchange: 'AI Rebalancer',
        notes: `Automated rebalancing: ${recommendation.reasoning}`
      };

      await transactionTracker.recordTransaction(transaction);
      onSendMessage(`Executed rebalancing recommendation: ${recommendation.action} ${recommendation.asset}`);
      
      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to execute rebalancing:', error);
      onSendMessage(`Failed to execute rebalancing: ${error}`);
    }
  };

  if (loading && !portfolioSummary) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-lg text-gray-600">Loading portfolio dashboard...</span>
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
              Retry
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
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Dashboard</h1>
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
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Portfolio Summary Cards */}
          {portfolioSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
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
                    <p className="text-sm text-gray-600">Total P&L</p>
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
                    <p className="text-sm text-gray-600">P&L Percentage</p>
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
                    <p className="text-sm text-gray-600">AI Score</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {aiReport?.overallScore || 'N/A'}
                    </p>
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
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'analytics', label: 'Analytics', icon: Activity },
              { id: 'insights', label: 'AI Insights', icon: Brain },
              { id: 'rebalancing', label: 'Rebalancing', icon: Target }
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
                <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
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
                <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
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
              <h3 className="text-lg font-semibold mb-4">Asset Performance</h3>
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
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tx.price)}
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
          <PerformanceBenchmarking onSendMessage={onSendMessage} />
        )}

        {activeTab === 'insights' && aiReport && (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">AI Portfolio Summary</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{aiReport.summary}</p>
              </div>
            </div>

            {/* Risk Alerts */}
            {aiReport.riskAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  Risk Alerts
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
                  Opportunities
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

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Personalized Recommendations</h3>
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
                      <p><strong>Benefit:</strong> {rec.potentialBenefit}</p>
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
              <h3 className="text-lg font-semibold mb-4">Automated Rebalancing Recommendations</h3>
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
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
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
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <p>Risk: {rec.riskLevel} | Confidence: {(rec.confidence * 100).toFixed(0)}%</p>
                        <p>Expected Impact: {rec.expectedImpact}</p>
                      </div>
                      <button
                        onClick={() => executeRebalancing(rec)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioDashboard; 