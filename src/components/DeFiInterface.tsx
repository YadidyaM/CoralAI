import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Shield, DollarSign } from 'lucide-react';
import { openaiService } from '../services/openaiService';
import { useAgentStore } from '../stores/agentStore';
import { coralMessaging } from '../services/coralMessaging';

export const DeFiInterface: React.FC = () => {
  const [amount, setAmount] = useState('50');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);
  const { addMessage, setAgentStatus } = useAgentStore();

  const defiOptions = [
    {
      name: 'Marinade Staking',
      apy: '6.8%',
      risk: 'Low',
      description: 'Liquid staking with mSOL',
      icon: <Shield className="w-5 h-5" />
    },
    {
      name: 'Orca Liquidity Pool',
      apy: '12.4%',
      risk: 'Medium',
      description: 'SOL/USDC LP rewards',
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      name: 'Raydium Yield Farm',
      apy: '18.7%',
      risk: 'High',
      description: 'High yield farming',
      icon: <Zap className="w-5 h-5" />
    }
  ];

  const getAIAdvice = async () => {
    setLoading(true);
    setAgentStatus('defi-scout', 'processing');
    
    addMessage({
      agentId: 'defi-scout',
      content: `Analyzing DeFi opportunities for ${amount} SOL...`,
      type: 'task'
    });

    try {
      const aiAdvice = await openaiService.getInvestmentAdvice(
        parseFloat(amount), 
        riskLevel
      );
      setAdvice(aiAdvice);
      
      addMessage({
        agentId: 'defi-scout',
        content: 'Found optimal DeFi strategy based on your risk profile',
        type: 'completion'
      });

      // Signal staking agent if needed
      if (riskLevel === 'low') {
        coralMessaging.initiateStakingFlow(parseFloat(amount));
      }

      setAgentStatus('defi-scout', 'idle');
    } catch (error) {
      addMessage({
        agentId: 'defi-scout',
        content: 'Failed to analyze DeFi opportunities',
        type: 'error'
      });
      setAgentStatus('defi-scout', 'error');
    } finally {
      setLoading(false);
    }
  };

  const investInOption = (option: typeof defiOptions[0]) => {
    addMessage({
      agentId: 'defi-scout',
      content: `Investing ${amount} SOL in ${option.name}`,
      type: 'task'
    });

    // Simulate investment
    setTimeout(() => {
      addMessage({
        agentId: 'defi-scout',
        content: `Successfully invested in ${option.name}! Expected APY: ${option.apy}`,
        type: 'completion'
      });
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center space-x-3 mb-6">
        <DollarSign className="w-6 h-6 text-green-400" />
        <h2 className="text-xl font-semibold text-white">DeFi Assistant</h2>
      </div>

      <div className="space-y-6">
        {/* Investment Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Investment Amount (SOL)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Risk Tolerance
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={getAIAdvice}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Get AI Investment Advice'}
          </motion.button>
        </div>

        {/* AI Advice */}
        {advice && (
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">AI Recommendation</h3>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{advice}</p>
          </div>
        )}

        {/* DeFi Options */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Available Opportunities</h3>
          <div className="space-y-3">
            {defiOptions.map((option, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-all cursor-pointer"
                onClick={() => investInOption(option)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-purple-400">{option.icon}</div>
                    <div>
                      <h4 className="font-medium text-white">{option.name}</h4>
                      <p className="text-sm text-gray-400">{option.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{option.apy}</p>
                    <p className="text-xs text-gray-400">{option.risk} Risk</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};