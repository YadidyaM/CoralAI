import React from 'react';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Brain,
  Loader
} from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { Agent } from '../types/agents';

interface AgentStatusIndicatorProps {
  variant?: 'compact' | 'detailed' | 'mini';
  showInactive?: boolean;
  maxAgents?: number;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  variant = 'compact',
  showInactive = false,
  maxAgents = 5
}) => {
  const { agents, currentAnalysis, getRecentActivity } = useAgentStore();
  
  const activeAgents = agents.filter(agent => 
    agent.status === 'active' || agent.status === 'processing'
  );
  
  const displayAgents = showInactive 
    ? agents.slice(0, maxAgents)
    : activeAgents.slice(0, maxAgents);

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <Zap className="w-3 h-3 text-green-400" />;
      case 'processing':
        return <Loader className="w-3 h-3 text-yellow-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return <CheckCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'border-green-500 bg-green-500/10';
      case 'processing': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-600 bg-gray-800/50';
    }
  };

  if (variant === 'mini') {
    return (
      <div className="flex items-center space-x-1">
        {activeAgents.length > 0 ? (
          <>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">
              {activeAgents.length} active
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-gray-500 rounded-full" />
            <span className="text-xs text-gray-500">All idle</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-gray-700">
        <div className="flex items-center space-x-1">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">Agents:</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {displayAgents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${getStatusColor(agent.status)}`}
              title={`${agent.name} - ${agent.status}`}
            >
              <span className="text-sm">{agent.avatar}</span>
              <div className="absolute -top-1 -right-1">
                {getStatusIcon(agent.status)}
              </div>
            </motion.div>
          ))}
          
          {activeAgents.length > maxAgents && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-600 bg-gray-800/50">
              <span className="text-xs text-gray-400">
                +{activeAgents.length - maxAgents}
              </span>
            </div>
          )}
        </div>

        {currentAnalysis && (
          <div className="flex items-center space-x-1 ml-2 pl-2 border-l border-gray-600">
            <div className={`w-2 h-2 rounded-full ${
              currentAnalysis.urgency === 'high' ? 'bg-red-400' :
              currentAnalysis.urgency === 'medium' ? 'bg-yellow-400' :
              'bg-green-400'
            }`} />
            <span className="text-xs text-gray-400 capitalize">
              {currentAnalysis.category}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          Agent Status
        </h3>
        {activeAgents.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Users className="w-3 h-3" />
            {activeAgents.length} active
          </div>
        )}
      </div>

      <div className="space-y-2">
        {displayAgents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${getStatusColor(agent.status)}`}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{agent.avatar}</div>
              <div>
                <h4 className="font-medium text-white text-sm">{agent.name}</h4>
                <p className="text-xs text-gray-400">{agent.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                agent.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                agent.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {agent.status}
              </span>
              {getStatusIcon(agent.status)}
            </div>
          </motion.div>
        ))}
      </div>

      {currentAnalysis && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Current Task:</span>
            <span className={`text-xs px-2 py-1 rounded ${
              currentAnalysis.category === 'nft' ? 'bg-purple-500/20 text-purple-400' :
              currentAnalysis.category === 'defi' ? 'bg-green-500/20 text-green-400' :
              currentAnalysis.category === 'wallet' ? 'bg-blue-500/20 text-blue-400' :
              currentAnalysis.category === 'staking' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {currentAnalysis.category}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{currentAnalysis.intent}</p>
        </div>
      )}

      {activeAgents.length === 0 && !currentAnalysis && (
        <div className="text-center py-4">
          <Bot className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">All agents are idle</p>
          <p className="text-gray-600 text-xs">Start a conversation to activate agents</p>
        </div>
      )}
    </div>
  );
}; 