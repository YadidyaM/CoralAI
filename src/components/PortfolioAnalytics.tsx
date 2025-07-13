import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, Activity, Coins } from 'lucide-react';

export const PortfolioAnalytics: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 1247.83,
    solBalance: 15.42,
    change24h: 5.67,
    performance: [
      { name: 'Jan', value: 850 },
      { name: 'Feb', value: 920 },
      { name: 'Mar', value: 1100 },
      { name: 'Apr', value: 1050 },
      { name: 'May', value: 1200 },
      { name: 'Jun', value: 1247 }
    ],
    allocation: [
      { name: 'SOL', value: 45, color: '#9945FF' },
      { name: 'Staking', value: 30, color: '#14F195' },
      { name: 'DeFi', value: 20, color: '#FF6B6B' },
      { name: 'NFTs', value: 5, color: '#4ECDC4' }
    ]
  });

  const yieldOpportunities = [
    { name: 'Marinade mSOL', apy: 6.8, tvl: '1.2B', risk: 'Low' },
    { name: 'Orca SOL/USDC', apy: 12.4, tvl: '45M', risk: 'Medium' },
    { name: 'Raydium RAY Farm', apy: 18.7, tvl: '23M', risk: 'High' },
    { name: 'Saber USDC/USDT', apy: 8.3, tvl: '78M', risk: 'Low' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Coins className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Total Portfolio</h3>
          </div>
          <p className="text-3xl font-bold text-white">${portfolioData.totalValue.toFixed(2)}</p>
          <p className={`text-sm ${portfolioData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {portfolioData.change24h >= 0 ? '+' : ''}{portfolioData.change24h}% (24h)
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-white">SOL Balance</h3>
          </div>
          <p className="text-3xl font-bold text-white">{portfolioData.solBalance}</p>
          <p className="text-sm text-gray-400">≈ ${(portfolioData.solBalance * 80.5).toFixed(2)}</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Avg APY</h3>
          </div>
          <p className="text-3xl font-bold text-white">8.9%</p>
          <p className="text-sm text-gray-400">Weighted average</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Portfolio Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={portfolioData.performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Bar dataKey="value" fill="#9945FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={portfolioData.allocation}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {portfolioData.allocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {portfolioData.allocation.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-300">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Yield Opportunities */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <PieChartIcon className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Top Yield Opportunities</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {yieldOpportunities.map((opportunity, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-white">{opportunity.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  opportunity.risk === 'Low' ? 'bg-green-600/20 text-green-300' :
                  opportunity.risk === 'Medium' ? 'bg-yellow-600/20 text-yellow-300' :
                  'bg-red-600/20 text-red-300'
                }`}>
                  {opportunity.risk}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-green-400">{opportunity.apy}%</p>
                  <p className="text-xs text-gray-400">APY</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">${opportunity.tvl}</p>
                  <p className="text-xs text-gray-400">TVL</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};