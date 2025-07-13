import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadialBarChart, RadialBar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { portfolioAnalytics, PerformanceMetrics, RiskMetrics, BenchmarkComparison } from '../services/portfolioAnalytics';
import { transactionTracker, PortfolioSnapshot } from '../services/transactionTracker';
import { useUserStore } from '../stores/userStore';

interface PerformanceBenchmarkingProps {
  onSendMessage: (message: string) => void;
}

const PerformanceBenchmarking: React.FC<PerformanceBenchmarkingProps> = ({ onSendMessage }) => {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<'performance' | 'risk' | 'benchmark' | 'insights'>('performance');
  const [timeFrame, setTimeFrame] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkComparison[]>([]);
  const [insights, setInsights] = useState<string>('');
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
  const [error, setError] = useState<string>('');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id, timeFrame]);

  const loadAnalytics = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Initialize transaction tracker
      await transactionTracker.initialize(user.id);
      
      // Load all analytics data
      const [performanceData, riskData, history] = await Promise.all([
        portfolioAnalytics.calculatePerformanceMetrics(user.id, timeFrame),
        portfolioAnalytics.calculateRiskMetrics(user.id, timeFrame),
        transactionTracker.getPortfolioHistory(user.id, timeFrame)
      ]);
      
      setPerformance(performanceData);
      setRisk(riskData);
      setPortfolioHistory(history);
      
      // Load benchmark comparisons
      const benchmarkSymbols = ['CRYPTO_INDEX', 'DEFI_INDEX', 'SOL', 'SPY'];
      const benchmarkData = await Promise.all(
        benchmarkSymbols.map(symbol => portfolioAnalytics.benchmarkComparison(user.id, symbol, timeFrame))
      );
      setBenchmarks(benchmarkData);
      
      // Generate insights
      const insightData = await portfolioAnalytics.generatePortfolioInsights(user.id, timeFrame);
      setInsights(insightData);
      
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics loading error:', err);
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

  const getRiskLevel = (value: number) => {
    if (value < 0.1) return { level: 'Low', color: 'text-green-500' };
    if (value < 0.3) return { level: 'Medium', color: 'text-yellow-500' };
    return { level: 'High', color: 'text-red-500' };
  };

  const prepareBenchmarkChart = () => {
    return benchmarks.map(b => ({
      name: b.benchmark,
      portfolio: b.portfolioReturn * 100,
      benchmark: b.benchmarkReturn * 100,
      outperformance: b.outperformance * 100
    }));
  };

  const preparePortfolioChart = () => {
    return portfolioHistory.map(snapshot => ({
      date: new Date(snapshot.timestamp).toLocaleDateString(),
      value: snapshot.totalValue,
      pnl: snapshot.totalPnL,
      pnlPercentage: snapshot.pnlPercentage
    }));
  };

  const prepareRiskChart = () => {
    if (!risk) return [];
    
    return [
      { name: 'VaR 95%', value: Math.abs(risk.valueAtRisk95) * 100, color: '#ef4444' },
      { name: 'VaR 99%', value: Math.abs(risk.valueAtRisk99) * 100, color: '#dc2626' },
      { name: 'Volatility', value: risk.portfolioVolatility * 100, color: '#f59e0b' },
      { name: 'Concentration', value: risk.concentrationRisk * 100, color: '#8b5cf6' },
      { name: 'Liquidity', value: risk.liquidityRisk * 100, color: '#06b6d4' }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-lg text-gray-600">Loading analytics...</span>
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
              onClick={loadAnalytics}
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
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
            <div className="flex items-center space-x-4">
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
                onClick={loadAnalytics}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="flex space-x-1 mb-6">
            {[
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'risk', label: 'Risk Analysis', icon: Shield },
              { id: 'benchmark', label: 'Benchmarks', icon: Target },
              { id: 'insights', label: 'AI Insights', icon: Info }
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

          {activeTab === 'performance' && performance && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Return</p>
                      <p className={`text-2xl font-bold ${getColorForValue(performance.totalReturn)}`}>
                        {formatPercentage(performance.totalReturn)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Annualized Return</p>
                      <p className={`text-2xl font-bold ${getColorForValue(performance.annualizedReturn)}`}>
                        {formatPercentage(performance.annualizedReturn)}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sharpe Ratio</p>
                      <p className={`text-2xl font-bold ${getColorForValue(performance.sharpeRatio)}`}>
                        {performance.sharpeRatio.toFixed(2)}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Max Drawdown</p>
                      <p className={`text-2xl font-bold ${getColorForValue(performance.maxDrawdown, true)}`}>
                        {formatPercentage(performance.maxDrawdown)}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={preparePortfolioChart()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [formatCurrency(value as number), name]} />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" name="Portfolio Value" strokeWidth={2} />
                      <Line type="monotone" dataKey="pnl" stroke="#10b981" name="Total P&L" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Advanced Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Beta</p>
                      <p className="text-xl font-bold">{performance.beta.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Alpha</p>
                      <p className={`text-xl font-bold ${getColorForValue(performance.alpha)}`}>
                        {formatPercentage(performance.alpha)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Win Rate</p>
                      <p className="text-xl font-bold">{formatPercentage(performance.winRate)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Profit Factor</p>
                      <p className="text-xl font-bold">{performance.profitFactor.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Sortino Ratio</p>
                      <p className="text-xl font-bold">{performance.sortinoRatio.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Calmar Ratio</p>
                      <p className="text-xl font-bold">{performance.calmarRatio.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risk' && risk && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">VaR (95%)</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPercentage(Math.abs(risk.valueAtRisk95))}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Portfolio Volatility</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatPercentage(risk.portfolioVolatility)}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Concentration Risk</p>
                      <p className={`text-2xl font-bold ${getRiskLevel(risk.concentrationRisk).color}`}>
                        {getRiskLevel(risk.concentrationRisk).level}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-purple-500" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Liquidity Risk</p>
                      <p className={`text-2xl font-bold ${getRiskLevel(risk.liquidityRisk).color}`}>
                        {getRiskLevel(risk.liquidityRisk).level}
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Breakdown</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareRiskChart()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Risk Level']} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Value at Risk (99%)</span>
                      <span className="font-bold text-red-600">{formatPercentage(Math.abs(risk.valueAtRisk99))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conditional VaR (95%)</span>
                      <span className="font-bold text-red-600">{formatPercentage(Math.abs(risk.conditionalVaR95))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conditional VaR (99%)</span>
                      <span className="font-bold text-red-600">{formatPercentage(Math.abs(risk.conditionalVaR99))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Correlation Risk</span>
                      <span className="font-bold text-purple-600">{formatPercentage(risk.correlationRisk)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Diversification Ratio</span>
                      <span className="font-bold text-green-600">{risk.diversificationRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tracking Error</span>
                      <span className="font-bold text-blue-600">{formatPercentage(risk.trackingError)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmark' && benchmarks.length > 0 && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Benchmark Comparison</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={prepareBenchmarkChart()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Return']} />
                    <Legend />
                    <Bar dataKey="portfolio" fill="#3b82f6" name="Portfolio" />
                    <Bar dataKey="benchmark" fill="#10b981" name="Benchmark" />
                    <Bar dataKey="outperformance" fill="#f59e0b" name="Outperformance" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {benchmarks.map((benchmark, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">{benchmark.benchmark}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Portfolio Return</p>
                        <p className={`text-lg font-bold ${getColorForValue(benchmark.portfolioReturn)}`}>
                          {formatPercentage(benchmark.portfolioReturn)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Benchmark Return</p>
                        <p className={`text-lg font-bold ${getColorForValue(benchmark.benchmarkReturn)}`}>
                          {formatPercentage(benchmark.benchmarkReturn)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Outperformance</p>
                        <p className={`text-lg font-bold ${getColorForValue(benchmark.outperformance)}`}>
                          {formatPercentage(benchmark.outperformance)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Beta</p>
                        <p className="text-lg font-bold">{benchmark.beta.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Alpha</p>
                        <p className={`text-lg font-bold ${getColorForValue(benchmark.alpha)}`}>
                          {formatPercentage(benchmark.alpha)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Info Ratio</p>
                        <p className="text-lg font-bold">{benchmark.informationRatio.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">AI-Powered Portfolio Insights</h3>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">{insights}</pre>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => onSendMessage(`Based on my portfolio analytics, can you provide specific recommendations for optimization?`)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <Info className="h-4 w-4" />
                  <span>Get Personalized Recommendations</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceBenchmarking; 