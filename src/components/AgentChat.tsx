import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader, ArrowLeft } from 'lucide-react';
import { Agent, AgentMessage } from '../types/agents';
import { useAgentStore } from '../stores/agentStore';
import { useUserStore } from '../stores/userStore';
import { coralMessaging } from '../services/coralMessaging';
import { openaiService } from '../services/openaiService';

interface AgentChatProps {
  agent: Agent;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'action' | 'coordination';
}

export const AgentChat: React.FC<AgentChatProps> = ({ agent, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addMessage, setAgentStatus } = useAgentStore();
  const { currentUser } = useUserStore();

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      content: getWelcomeMessage(agent.id),
      sender: 'agent',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  }, [agent.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getWelcomeMessage = (agentId: string): string => {
    switch (agentId) {
      case 'onboarding-guide':
        return "Hi! I'm your OnboardingGuide. I'll help you get started with Solana and coordinate with other agents to make your journey smooth. What would you like to learn about?";
      case 'wallet-wizard':
        return "Welcome! I'm WalletWizard, your security expert. I can help you create wallets, manage keys, and ensure your crypto stays safe. How can I assist you?";
      case 'defi-scout':
        return "Hey there! I'm DeFiScout, your yield farming specialist. I find the best DeFi opportunities and can coordinate with StakingAgent for optimal returns. What's your investment goal?";
      case 'nft-creator':
        return "Greetings! I'm NFTCreator, your AI art companion. I can generate unique artwork and mint NFTs on Solana. Describe what you'd like to create!";
      case 'staking-agent':
        return "Hello! I'm StakingAgent, your passive income optimizer. I help you stake tokens and maximize rewards. Ready to start earning?";
      default:
        return "Hello! How can I help you today?";
    }
  };

  const getAgentPersonality = (agentId: string): string => {
    switch (agentId) {
      case 'onboarding-guide':
        return "You are a friendly, patient onboarding guide who helps new users understand Solana and crypto. You coordinate with other agents and explain complex concepts simply.";
      case 'wallet-wizard':
        return "You are a security-focused wallet expert who prioritizes safety and best practices. You're knowledgeable about wallet creation, key management, and security protocols.";
      case 'defi-scout':
        return "You are an analytical DeFi expert who finds yield opportunities and assesses risks. You coordinate with StakingAgent and provide data-driven investment advice.";
      case 'nft-creator':
        return "You are a creative AI artist who helps users create and mint NFTs. You're enthusiastic about art and can generate creative ideas and artwork descriptions.";
      case 'staking-agent':
        return "You are a methodical staking specialist focused on maximizing passive income. You analyze validators, calculate rewards, and optimize staking strategies.";
      default:
        return "You are a helpful AI assistant.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setAgentStatus(agent.id, 'processing');

    // Add to global message feed
    addMessage({
      agentId: agent.id,
      content: `User: ${inputMessage}`,
      type: 'info'
    });

    try {
      // Generate AI response
      const response = await generateAgentResponse(agent.id, inputMessage, messages);
      
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: response.content,
        sender: 'agent',
        timestamp: new Date(),
        type: response.type || 'text'
      };

      setMessages(prev => [...prev, agentMessage]);

      // Add to global message feed
      addMessage({
        agentId: agent.id,
        content: response.content,
        type: 'completion'
      });

      // Handle agent coordination if needed
      if (response.coordination) {
        handleAgentCoordination(agent.id, response.coordination);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: "I'm having trouble processing your request right now. Please try again.",
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setAgentStatus(agent.id, 'idle');
    }
  };

  const generateAgentResponse = async (agentId: string, userInput: string, chatHistory: ChatMessage[]): Promise<{
    content: string;
    type?: 'text' | 'action' | 'coordination';
    coordination?: { targetAgent: string; action: string; data?: any };
  }> => {
    const personality = getAgentPersonality(agentId);
    const context = chatHistory.slice(-5).map(msg => `${msg.sender}: ${msg.content}`).join('\n');
    
    const prompt = `${personality}

Recent conversation:
${context}

User just said: "${userInput}"

Respond as ${agent.name} in character. If you need to coordinate with another agent, mention it naturally in your response. Keep responses concise and helpful.

For example:
- If user asks about DeFi and you're OnboardingGuide, mention coordinating with DeFiScout
- If user wants to create NFT and you're DeFiScout, suggest they talk to NFTCreator
- If user asks about staking and you're DeFiScout, coordinate with StakingAgent

Respond naturally and in character.`;

    try {
      const aiResponse = await openaiService.getChatResponse(prompt);
      
      // Check if response mentions coordination
      let coordination;
      if (aiResponse.includes('DeFiScout') && agentId !== 'defi-scout') {
        coordination = { targetAgent: 'defi-scout', action: 'assist_user' };
      } else if (aiResponse.includes('WalletWizard') && agentId !== 'wallet-wizard') {
        coordination = { targetAgent: 'wallet-wizard', action: 'assist_user' };
      } else if (aiResponse.includes('NFTCreator') && agentId !== 'nft-creator') {
        coordination = { targetAgent: 'nft-creator', action: 'assist_user' };
      } else if (aiResponse.includes('StakingAgent') && agentId !== 'staking-agent') {
        coordination = { targetAgent: 'staking-agent', action: 'assist_user' };
      }

      return {
        content: aiResponse,
        type: 'text',
        coordination
      };
    } catch (error) {
      // Fallback responses
      const fallbackResponses = {
        'onboarding-guide': "I'd be happy to help you get started! Let me coordinate with the right specialist for your needs.",
        'wallet-wizard': "I can help you with wallet security and setup. What specific wallet task do you need assistance with?",
        'defi-scout': "I'm analyzing the best DeFi opportunities for you. What's your risk tolerance and investment amount?",
        'nft-creator': "I'm excited to help you create something unique! What kind of artwork are you envisioning?",
        'staking-agent': "Let's get you earning passive income! How much would you like to stake?"
      };

      return {
        content: fallbackResponses[agentId as keyof typeof fallbackResponses] || "How can I help you today?",
        type: 'text'
      };
    }
  };

  const handleAgentCoordination = (fromAgent: string, coordination: { targetAgent: string; action: string; data?: any }) => {
    // Send coordination message through Coral
    coralMessaging.send({
      from: fromAgent,
      to: coordination.targetAgent,
      type: 'coordination',
      payload: {
        action: coordination.action,
        userRequest: inputMessage,
        data: coordination.data
      }
    });

    // Add coordination message to chat
    const coordinationMessage: ChatMessage = {
      id: `coord-${Date.now()}`,
      content: `🤝 Coordinating with ${coordination.targetAgent.replace('-', ' ')} to better assist you...`,
      sender: 'agent',
      timestamp: new Date(),
      type: 'coordination'
    };

    setMessages(prev => [...prev, coordinationMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{agent.avatar}</div>
          <div>
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-sm text-gray-400">{agent.description}</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${
          agent.status === 'active' ? 'bg-green-500' :
          agent.status === 'processing' ? 'bg-yellow-500' :
          agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-purple-600' 
                    : message.type === 'coordination'
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : message.type === 'coordination'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                    : 'bg-gray-700 text-white'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${agent.name}...`}
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            disabled={isTyping}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTyping ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};