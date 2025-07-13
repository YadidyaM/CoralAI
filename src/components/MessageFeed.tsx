import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../stores/agentStore';
import { Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const MessageFeed: React.FC = () => {
  const { messages, agents } = useAgentStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAgent = (agentId: string) => 
    agents.find(agent => agent.id === agentId);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'completion': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'task': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-4">Agent Communications</h3>
      
      <div className="space-y-3">
        <AnimatePresence>
          {messages.map((message) => {
            const agent = getAgent(message.agentId);
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg"
              >
                <div className="text-2xl">{agent?.avatar || '🤖'}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-white">{agent?.name || 'Unknown Agent'}</span>
                    {getMessageIcon(message.type)}
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{message.content}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      <div ref={messagesEndRef} />
    </div>
  );
};