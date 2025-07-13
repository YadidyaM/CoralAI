import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, Clock, Users, Zap, Calculator, Eye, Wallet } from 'lucide-react';

interface LiquidityPool {
  id: string;
  tokenA: string;
  tokenB: string;
  symbolA: string;
  symbolB: string;
  reserve0: number;
  reserve1: number;
  totalSupply: number;
  price: number;
  apy: number;
  volume24h: number;
  volume7d: number;
  fees24h: number;
  fees7d: number;
  tvl: number;
  priceChange24h: number;
  volumeChange24h: number;
  liquidityChange24h: number;
  participants: number;
  priceHistory: Array<{ timestamp: number; price: number; volume: number; }>;
}

interface ImpermanentLossCalculation {
  initialPriceA: number;
  initialPriceB: number;
  currentPriceA: number;
  currentPriceB: number;
  priceRatio: number;
  impermanentLoss: number;
  percentageLoss: number;
  holdingValue: number;
  poolValue: number;
  feeCompensation: number;
  netResult: number;
}

interface PoolMetrics {
  efficiency: number;
  utilization: number;
  slippage: number;
  depth: number;
  spread: number;
  volatility: number;
  correlation: number;
  sustainability: number;
}

interface LiquidityPosition {
  poolId: string;
  tokenA: string;
  tokenB: string;
  liquidityTokens: number;
  share: number;
  value: number;
  fees: number;
  impermanentLoss: number;
  entryPrice: number;
  entryTime: number;
  unrealizedPnL: number;
}

export const LiquidityPoolAnalytics: React.FC = () => {
  const [selectedPool, setSelectedPool] = useState<LiquidityPool | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'calculator' | 'positions' | 'analytics'>('overview');
  const [calculatorInputs, setCalculatorInputs] = useState({
    tokenA: 'SOL',
    tokenB: 'USDC',
    priceA: 80,
    priceB: 1,
    futurePA: 100,
    futurePB: 1,
    amount: 1000,
    timeframe: 30
  });
  const [userPositions, setUserPositions] = useState<LiquidityPosition[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock liquidity pools data
  const liquidityPools: LiquidityPool[] = [
    {
      id: 'sol-usdc',
      tokenA: 'SOL',
      tokenB: 'USDC',
      symbolA: 'SOL',
      symbolB: 'USDC',
      reserve0: 562500,
      reserve1: 45000000,
      totalSupply: 5000000,
      price: 80,
      apy: 12.4,
      volume24h: 2300000,
      volume7d: 18400000,
      fees24h: 6900,
      fees7d: 55200,
      tvl: 90000000,
      priceChange24h: 2.3,
      volumeChange24h: -8.5,
      liquidityChange24h: 1.2,
      participants: 1847,
      priceHistory: Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        price: 80 + Math.sin(i * 0.5) * 10 + Math.random() * 5,
        volume: 2000000 + Math.random() * 1000000
      }))
    },
    {
      id: 'ray-sol',
      tokenA: 'RAY',
      tokenB: 'SOL',
      symbolA: 'RAY',
      symbolB: 'SOL',
      reserve0: 1875000,
      reserve1: 46875,
      totalSupply: 300000,
      price: 0.025,
      apy: 18.7,
      volume24h: 1200000,
      volume7d: 9600000,
      fees24h: 3600,
      fees7d: 28800,
      tvl: 7500000,
      priceChange24h: -4.2,
      volumeChange24h: 15.3,
      liquidityChange24h: -2.1,
      participants: 892,
      priceHistory: Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        price: 0.025 + Math.sin(i * 0.3) * 0.005 + Math.random() * 0.002,
        volume: 1000000 + Math.random() * 500000
      }))
    },
    {
      id: 'msol-sol',
      tokenA: 'mSOL',
      tokenB: 'SOL',
      symbolA: 'mSOL',
      symbolB: 'SOL',
      reserve0: 833333,
      reserve1: 875000,
      totalSupply: 850000,
      price: 1.05,
      apy: 8.9,
      volume24h: 890000,
      volume7d: 6230000,
      fees24h: 2670,
      fees7d: 18690,
      tvl: 140000000,
      priceChange24h: 0.8,
      volumeChange24h: -12.1,
      liquidityChange24h: 0.5,
      participants: 2156,
      priceHistory: Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        price: 1.05 + Math.sin(i * 0.2) * 0.02 + Math.random() * 0.01,
        volume: 800000 + Math.random() * 200000
      }))
    }
  ];

  useEffect(() => {
    if (!selectedPool) {
      setSelectedPool(liquidityPools[0]);
    }
  }, []);

  useEffect(() => {
    // Mock user positions
    setUserPositions([
      {
        poolId: 'sol-usdc',
        tokenA: 'SOL',
        tokenB: 'USDC',
        liquidityTokens: 1250,
        share: 0.025,
        value: 2250,
        fees: 28.5,
        impermanentLoss: -15.2,
        entryPrice: 75,
        entryTime: Date.now() - 15 * 24 * 60 * 60 * 1000,
        unrealizedPnL: 185.3
      },
      {
        poolId: 'ray-sol',
        tokenA: 'RAY',
        tokenB: 'SOL',
        liquidityTokens: 500,
        share: 0.167,
        value: 1250,
        fees: 45.8,
        impermanentLoss: -8.7,
        entryPrice: 0.028,
        entryTime: Date.now() - 8 * 24 * 60 * 60 * 1000,
        unrealizedPnL: 37.1
      }
    ]);
  }, []);

  const calculateImpermanentLoss = (
    initialPA: number,
    initialPB: number,
    currentPA: number,
    currentPB: number,
    feeRate: number = 0.003
  ): ImpermanentLossCalculation => {
    const priceRatio = (currentPA / initialPA) / (currentPB / initialPB);
    const sqrtRatio = Math.sqrt(priceRatio);
    
    // Calculate pool value vs holding
    const poolValue = 2 * sqrtRatio / (1 + priceRatio);
    const holdingValue = 0.5 * (currentPA / initialPA) + 0.5 * (currentPB / initialPB);
    
    const impermanentLoss = poolValue - holdingValue;
    const percentageLoss = (impermanentLoss / holdingValue) * 100;
    
    // Estimate fee compensation (simplified)
    const feeCompensation = feeRate * 365 * 0.5; // Approximate annual fee yield
    const netResult = impermanentLoss + feeCompensation;
    
    return {
      initialPriceA: initialPA,
      initialPriceB: initialPB,
      currentPriceA: currentPA,
      currentPriceB: currentPB,
      priceRatio,
      impermanentLoss,
      percentageLoss,
      holdingValue,
      poolValue,
      feeCompensation,
      netResult
    };
  };

  const calculatePoolMetrics = (pool: LiquidityPool): PoolMetrics => {
    const efficiency = Math.min(pool.volume24h / pool.tvl * 100, 100);
    const utilization = Math.min(pool.volume24h / (pool.tvl * 0.5) * 100, 100);
    const slippage = Math.max(0.1, Math.min(pool.volume24h / pool.tvl * 0.01, 5));
    const depth = Math.sqrt(pool.reserve0 * pool.reserve1) / 1000;
    const spread = 0.003 * (1 + 1 / Math.sqrt(pool.tvl / 1000000));
    const volatility = Math.abs(pool.priceChange24h) + Math.random() * 5;
    const correlation = 0.85 + Math.random() * 0.1;
    const sustainability = Math.min(pool.fees24h / (pool.tvl * 0.001) * 100, 100);
    
    return {
      efficiency,
      utilization,
      slippage,
      depth,
      spread,
      volatility,
      correlation,
      sustainability
    };
  };

  const impermanentLossCalculation = useMemo(() => {
    return calculateImpermanentLoss(
      calculatorInputs.priceA,
      calculatorInputs.priceB,
      calculatorInputs.futurePA,
      calculatorInputs.futurePB
    );
  }, [calculatorInputs]);

  const selectedPoolMetrics = useMemo(() => {
    return selectedPool ? calculatePoolMetrics(selectedPool) : null;
  }, [selectedPool]);

  const formatCurrency = (amount: number, symbol: string = '$') => {
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Pool Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liquidityPools.map((pool) => (
          <motion.div
            key={pool.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedPool(pool)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedPool?.id === pool.id
                ? 'border-purple-500 bg-purple-900/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                </div>
                <span className="text-white font-medium">{pool.tokenA}/{pool.tokenB}</span>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                pool.priceChange24h > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              }`}>
                {pool.priceChange24h > 0 ? '+' : ''}{pool.priceChange24h.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">APY</span>
                <span className="text-green-400 font-medium">{pool.apy}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TVL</span>
                <span className="text-white">{formatCurrency(pool.tvl)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Volume 24h</span>
                <span className="text-white">{formatCurrency(pool.volume24h)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected Pool Details */}
      {selectedPool && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pool Statistics */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Pool Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Total Liquidity</p>
                <p className="text-white font-bold text-lg">{formatCurrency(selectedPool.tvl)}</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-white font-bold text-lg">{formatCurrency(selectedPool.volume24h)}</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">24h Fees</p>
                <p className="text-green-400 font-bold text-lg">{formatCurrency(selectedPool.fees24h)}</p>
              </div>
              <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                <p className="text-gray-400 text-sm">Participants</p>
                <p className="text-white font-bold text-lg">{selectedPool.participants}</p>
              </div>
            </div>
          </div>

          {/* Pool Metrics */}
          {selectedPoolMetrics && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Pool Health Metrics</h3>
              <div className="space-y-3">
                {Object.entries(selectedPoolMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                          style={{ width: `${Math.min(value, 100)}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-12 text-right">{value.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price History Chart */}
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Price History (30 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedPool.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp"
                    tick={{ fill: '#9CA3AF' }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCalculator = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Impermanent Loss Calculator</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token A</label>
                <input
                  type="text"
                  value={calculatorInputs.tokenA}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, tokenA: e.target.value})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token B</label>
                <input
                  type="text"
                  value={calculatorInputs.tokenB}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, tokenB: e.target.value})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Initial Price A</label>
                <input
                  type="number"
                  value={calculatorInputs.priceA}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, priceA: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Initial Price B</label>
                <input
                  type="number"
                  value={calculatorInputs.priceB}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, priceB: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Future Price A</label>
                <input
                  type="number"
                  value={calculatorInputs.futurePA}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, futurePA: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Future Price B</label>
                <input
                  type="number"
                  value={calculatorInputs.futurePB}
                  onChange={(e) => setCalculatorInputs({...calculatorInputs, futurePB: Number(e.target.value)})}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">Impermanent Loss Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price Ratio Change</span>
                  <span className="text-white">{impermanentLossCalculation.priceRatio.toFixed(3)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holding Value</span>
                  <span className="text-white">{impermanentLossCalculation.holdingValue.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pool Value</span>
                  <span className="text-white">{impermanentLossCalculation.poolValue.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Impermanent Loss</span>
                  <span className={`font-bold ${impermanentLossCalculation.percentageLoss < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {impermanentLossCalculation.percentageLoss.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">Fee Compensation</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Annual Fee Yield</span>
                  <span className="text-green-400">{(impermanentLossCalculation.feeCompensation * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Net Result</span>
                  <span className={`font-bold ${impermanentLossCalculation.netResult < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {(impermanentLossCalculation.netResult * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* IL Visualization */}
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-3">IL Risk Visualization</h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({length: 50}, (_, i) => {
                    const ratio = 0.5 + (i * 0.05);
                    const il = (2 * Math.sqrt(ratio) / (1 + ratio)) - 1;
                    return { ratio, il: il * 100 };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="ratio" tick={{ fill: '#9CA3AF' }} />
                    <YAxis tick={{ fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="il" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPositions = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Your Liquidity Positions</h3>
        
        {userPositions.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No liquidity positions found</p>
        ) : (
          <div className="space-y-4">
            {userPositions.map((position, index) => (
              <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{position.tokenA}</span>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{position.tokenB}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-white">{position.tokenA}/{position.tokenB}</p>
                      <p className="text-sm text-gray-400">Pool share: {(position.share * 100).toFixed(3)}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{formatCurrency(position.value)}</p>
                    <p className={`text-sm ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Liquidity Tokens</span>
                    <p className="text-white font-medium">{position.liquidityTokens.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Fees Earned</span>
                    <p className="text-green-400 font-medium">{formatCurrency(position.fees)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Impermanent Loss</span>
                    <p className={`font-medium ${position.impermanentLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {position.impermanentLoss >= 0 ? '+' : ''}{position.impermanentLoss.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Days Active</span>
                    <p className="text-white font-medium">{Math.floor((Date.now() - position.entryTime) / (1000 * 60 * 60 * 24))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Pool Overview', icon: Activity },
    { id: 'calculator', label: 'IL Calculator', icon: Calculator },
    { id: 'positions', label: 'My Positions', icon: Wallet },
    { id: 'analytics', label: 'Advanced Analytics', icon: TrendingUp }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pool Analytics</h1>
        <p className="text-gray-400">Comprehensive analysis of liquidity pools with impermanent loss calculations</p>
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'calculator' && renderCalculator()}
        {activeTab === 'positions' && renderPositions()}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Advanced analytics coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidityPoolAnalytics; 