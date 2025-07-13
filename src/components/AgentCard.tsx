import React from 'react';
import { motion } from 'framer-motion';
import { Agent } from '../types/agents';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700 cursor-pointer hover:border-purple-500 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{agent.avatar}</div>
          <div>
            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
            <p className="text-gray-400 text-sm">{agent.description}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Specialties:</h4>
        <div className="flex flex-wrap gap-2">
          {agent.specialties.map((specialty, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};