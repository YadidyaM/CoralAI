import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { AgentChat } from './AgentChat';
import { Agent } from '../types/agents';

export const AgentsOverview: React.FC = () => {
  const { agents, messages } = useAgentStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  if (selectedAgent) {
    return (
      <AgentChat 
        agent={selectedAgent} 
        onBack={() => setSelectedAgent(null)} 
      />
    );
  }

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAgentMessages = (agentId: string) => {
    return messages.filter(msg => msg.agentId === agentId).slice(-3);
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'border-green-500 bg-green-500/10';
      case 'processing': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-600 bg-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Agents Dashboard</h2>
        <p className="text-gray-400">
          Interact directly with your AI agents and monitor their coordination activities.
        </p>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const recentMessages = getAgentMessages(agent.id);
          
          return (
            <motion.div
              key={agent.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-xl p-6 border-2 transition-all cursor-pointer ${getStatusColor(agent.status)}`}
              onClick={() => setSelectedAgent(agent)}
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">{agent.avatar}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                    <p className="text-sm text-gray-400">{agent.description}</p>
                  </div>
                </div>
                {getStatusIcon(agent.status)}
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  agent.status === 'active' ? 'bg-green-100 text-green-800' :
                  agent.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  agent.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>

              {/* Specialties */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Specialties:</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.specialties.slice(0, 2).map((specialty, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                  {agent.specialties.length > 2 && (
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                      +{agent.specialties.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Recent Activity:</h4>
                {recentMessages.length > 0 ? (
                  <div className="space-y-1">
                    {recentMessages.map((message) => (
                      <div key={message.id} className="text-xs text-gray-400 truncate">
                        • {message.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No recent activity</p>
                )}
              </div>

              {/* Chat Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Start Chat</span>
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Coordination Activity */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Agent Coordination Activity</h3>
        
        {messages.length > 0 ? (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {messages.slice(-10).reverse().map((message) => {
              const agent = agents.find(a => a.id === message.agentId);
              return (
                <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-900 rounded-lg">
                  <div className="text-2xl">{agent?.avatar || '🤖'}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">{agent?.name || 'Unknown Agent'}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        message.type === 'completion' ? 'bg-green-400' :
                        message.type === 'error' ? 'bg-red-400' :
                        message.type === 'task' ? 'bg-yellow-400' :
                        'bg-blue-400'
                      }`} />
                      <span className="text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">{message.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No coordination activity yet. Start chatting with an agent to see them in action!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};