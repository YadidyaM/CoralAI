import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { AgentActivation, PromptAnalysis } from '../services/agentRouter';
import { Agent } from '../types/agents';

interface DynamicAgentSidebarProps {
  currentAnalysis: PromptAnalysis | null;
  onAgentSelect: (agentId: string) => void;
  isVisible: boolean;
}

export const DynamicAgentSidebar: React.FC<DynamicAgentSidebarProps> = ({
  currentAnalysis,
  onAgentSelect,
  isVisible
}) => {
  const { agents, setAgentStatus } = useAgentStore();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const getAgentById = (agentId: string): Agent | undefined => {
    return agents.find(agent => agent.id === agentId);
  };

  const getPriorityColor = (priority: AgentActivation['priority']) => {
    switch (priority) {
      case 'primary': return 'border-green-500 bg-green-500/20';
      case 'secondary': return 'border-yellow-500 bg-yellow-500/20';
      case 'support': return 'border-blue-500 bg-blue-500/20';
      default: return 'border-gray-500 bg-gray-500/20';
    }
  };

  const getPriorityIcon = (priority: AgentActivation['priority']) => {
    switch (priority) {
      case 'primary': return <Zap className="w-4 h-4 text-green-400" />;
      case 'secondary': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      case 'support': return <Users className="w-4 h-4 text-blue-400" />;
      default: return <Bot className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const color = confidence > 0.7 ? 'bg-green-400' : confidence > 0.5 ? 'bg-yellow-400' : 'bg-red-400';
    
    return (
      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="text-xs text-gray-400 mt-1 block">{percentage}% confidence</span>
      </div>
    );
  };

  const handleAgentClick = (activation: AgentActivation) => {
    const agent = getAgentById(activation.agentId);
    if (agent) {
      setAgentStatus(activation.agentId, 'active');
      onAgentSelect(activation.agentId);
      setExpandedAgent(expandedAgent === activation.agentId ? null : activation.agentId);
    }
  };

  if (!isVisible || !currentAnalysis) {
    return null;
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-4 top-20 w-80 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-50 max-h-[80vh] overflow-hidden"
    >
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Smart Agents
          </h3>
          <div className="flex items-center gap-2">
            {currentAnalysis.requiresMultiAgent && (
              <div className="flex items-center gap-1 text-xs text-blue-400">
                <Users className="w-3 h-3" />
                Multi-Agent
              </div>
            )}
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              currentAnalysis.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
              currentAnalysis.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {currentAnalysis.urgency} priority
            </div>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-sm text-gray-300">{currentAnalysis.intent}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400">Category:</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              currentAnalysis.category === 'nft' ? 'bg-purple-500/20 text-purple-400' :
              currentAnalysis.category === 'defi' ? 'bg-green-500/20 text-green-400' :
              currentAnalysis.category === 'wallet' ? 'bg-blue-500/20 text-blue-400' :
              currentAnalysis.category === 'staking' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {currentAnalysis.category}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-y-auto max-h-96">
        <AnimatePresence>
          {currentAnalysis.activations.map((activation, index) => {
            const agent = getAgentById(activation.agentId);
            const isExpanded = expandedAgent === activation.agentId;
            
            if (!agent) return null;

            return (
              <motion.div
                key={activation.agentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`mb-3 rounded-lg border-2 transition-all cursor-pointer hover:scale-[1.02] ${getPriorityColor(activation.priority)}`}
                onClick={() => handleAgentClick(activation)}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{agent.avatar}</div>
                      <div>
                        <h4 className="font-medium text-white flex items-center gap-2">
                          {agent.name}
                          {getPriorityIcon(activation.priority)}
                        </h4>
                        <p className="text-xs text-gray-400">{agent.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        agent.status === 'active' ? 'bg-green-400' :
                        agent.status === 'processing' ? 'bg-yellow-400 animate-pulse' :
                        agent.status === 'error' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`} />
                      <ChevronRight 
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`} 
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    {getConfidenceBar(activation.confidence)}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-600"
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-300">Reasoning:</span>
                            <p className="text-xs text-gray-400 mt-1">{activation.reasoning}</p>
                          </div>
                          
                          <div>
                            <span className="text-xs font-medium text-gray-300">Suggested Actions:</span>
                            <ul className="mt-1 space-y-1">
                              {activation.suggestedActions.map((action, actionIndex) => (
                                <li key={actionIndex} className="text-xs text-gray-400 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-xs font-medium text-gray-300">Specialties:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.specialties.slice(0, 3).map((specialty, specIndex) => (
                                <span 
                                  key={specIndex}
                                  className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {agent.specialties.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{agent.specialties.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {currentAnalysis.activations.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No agents activated</p>
            <p className="text-gray-500 text-xs">Try being more specific in your request</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              currentAnalysis.activations.forEach(activation => {
                setAgentStatus(activation.agentId, 'active');
              });
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Activate All
          </button>
          <button
            onClick={() => {
              agents.forEach(agent => {
                setAgentStatus(agent.id, 'idle');
              });
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Clock className="w-3 h-3" />
            Reset All
          </button>
        </div>
      </div>
    </motion.div>
  );
}; 