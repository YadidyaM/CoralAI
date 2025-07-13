import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader, ArrowLeft, Zap, Brain, Users } from 'lucide-react';
import { Agent, AgentMessage } from '../types/agents';
import { useAgentStore } from '../stores/agentStore';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { DynamicAgentSidebar } from './DynamicAgentSidebar';
import { PromptAnalysis } from '../services/agentRouter';
import { openaiService } from '../services/openaiService';

interface SmartAgentChatProps {
  onBack?: () => void;
  initialAgent?: Agent;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  type?: 'text' | 'action' | 'coordination' | 'task_result';
  agentId?: string;
  metadata?: any;
}

export const SmartAgentChat: React.FC<SmartAgentChatProps> = ({ onBack, initialAgent }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<PromptAnalysis | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { agents, setAgentStatus, addMessage } = useAgentStore();
  const { currentUser } = useSupabaseUserStore();

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: `welcome-${Date.now()}`,
      content: initialAgent 
        ? `Hi! I'm ${initialAgent.name}. I can work with other agents to help you accomplish complex tasks. What would you like to do?`
        : "Welcome to Smart Agent Chat! I can analyze your requests and automatically activate the right agents to help you. Try asking me to create an NFT, find staking opportunities, or help with DeFi!",
      sender: 'system',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  }, [initialAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Process the prompt with the orchestrator
      const result = await agentOrchestrator.processUserPrompt(currentInput, messages);
      
      setCurrentAnalysis(result.analysis);
      setActiveAgents(result.activatedAgents);
      setShowSidebar(true);

      // Add system message about agent activation
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        content: `🧠 Analyzed your request: "${result.analysis.intent}"\n🤖 Activated ${result.activatedAgents.length} agent(s): ${result.activatedAgents.map(id => agents.find(a => a.id === id)?.name || id).join(', ')}`,
        sender: 'system',
        timestamp: new Date(),
        type: 'coordination',
        metadata: { analysis: result.analysis, task: result.task }
      };

      setMessages(prev => [...prev, systemMessage]);

      // Generate AI response based on the analysis
      const agentResponse = await generateSmartResponse(result.analysis, currentInput);
      
      const responseMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: agentResponse,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text',
        agentId: result.analysis.activations[0]?.agentId || 'system'
      };

      setMessages(prev => [...prev, responseMessage]);

      // Check for task completion after a delay
      setTimeout(async () => {
        const currentTask = agentOrchestrator.getCurrentTask();
        if (currentTask && currentTask.result) {
          const taskMessage: ChatMessage = {
            id: `task-${Date.now()}`,
            content: formatTaskResult(currentTask),
            sender: 'system',
            timestamp: new Date(),
            type: 'task_result',
            metadata: { task: currentTask }
          };
          setMessages(prev => [...prev, taskMessage]);
        }
      }, 3000);

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: "I'm having trouble processing your request right now. Please try again.",
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSmartResponse = async (analysis: PromptAnalysis, userInput: string): Promise<string> => {
    try {
      const primaryAgent = analysis.activations[0];
      const agentInfo = agents.find(a => a.id === primaryAgent?.agentId);
      
      const prompt = `You are ${agentInfo?.name || 'a smart AI assistant'} working in a multi-agent system. 
      
Current analysis:
- User intent: ${analysis.intent}
- Category: ${analysis.category}
- Activated agents: ${analysis.activations.map(a => a.agentId).join(', ')}
- Multi-agent task: ${analysis.requiresMultiAgent}

User said: "${userInput}"

Respond as the ${agentInfo?.name || 'primary agent'} explaining what you and other agents are doing to help. Be enthusiastic about the coordination and mention specific actions being taken. Keep it concise but informative.

${analysis.category === 'nft' ? 'If this is about NFT creation, mention that you\'re already generating the artwork automatically.' : ''}
${analysis.category === 'defi' ? 'If this is about DeFi, mention that you\'re analyzing opportunities right now.' : ''}
${analysis.category === 'wallet' ? 'If this is about wallets, mention security best practices.' : ''}`;

      return await openaiService.getChatResponse(prompt);
    } catch (error) {
      return `I'm coordinating with ${analysis.activations.length} agent(s) to help you with: ${analysis.intent}. Please check the sidebar to see the agents in action!`;
    }
  };

  const formatTaskResult = (task: any): string => {
    switch (task.type) {
      case 'nft_creation':
        if (task.result?.minted && task.result?.savedNFT) {
          return `🎨 NFT Successfully Minted & Saved!\n📝 Name: ${task.result.metadata.name}\n📖 Description: ${task.result.metadata.description}\n🪙 Minted to: ${task.result.wallet.name}\n💾 Permanently saved to your collection!`;
        } else if (task.result?.metadata) {
          return `🎨 NFT Artwork Generated!\n📝 Name: ${task.result.metadata.name}\n📖 Description: ${task.result.metadata.description}\n⏳ Ready for minting...`;
        }
        break;
      case 'defi_analysis':
        if (task.result?.advice) {
          return `💰 DeFi Analysis Complete!\n💡 Found optimal strategy for ${task.result.amount} SOL\n📊 Strategy: ${task.result.advice.substring(0, 150)}...`;
        }
        break;
      case 'wallet_setup':
        if (task.result?.persistent && task.result?.savedWallet) {
          return `🔐 Wallet Created & Saved!\n📍 Address: ${task.result.wallet.address.slice(0, 8)}...${task.result.wallet.address.slice(-8)}\n💾 Name: ${task.result.savedWallet.name}\n✅ Permanently saved to your account!`;
        } else if (task.result?.wallet) {
          return `🔐 Wallet Created!\n📍 Address: ${task.result.wallet.address?.slice(0, 8) || task.result.wallet.publicKey?.slice(0, 8)}...${task.result.wallet.address?.slice(-8) || task.result.wallet.publicKey?.slice(-8)}\n✅ Ready to use!`;
        }
        break;
      case 'staking_setup':
        if (task.result?.apy) {
          return `⚡ Staking Analysis Complete!\n📈 Found validators with ${task.result.apy}% APY\n🎯 Ready to start earning passive income!`;
        }
        break;
    }
    return `✅ Task completed: ${task.description}`;
  };

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      const agentMessage: ChatMessage = {
        id: `agent-select-${Date.now()}`,
        content: `🤖 Switching focus to ${agent.name} (${agent.description})`,
        sender: 'system',
        timestamp: new Date(),
        type: 'coordination',
        agentId
      };
      setMessages(prev => [...prev, agentMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    switch (message.type) {
      case 'coordination':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'task_result':
        return <Zap className="w-4 h-4 text-green-400" />;
      default:
        return message.sender === 'user' ? 
          <User className="w-4 h-4 text-white" /> : 
          <Bot className="w-4 h-4 text-white" />;
    }
  };

  const getMessageStyle = (message: ChatMessage) => {
    switch (message.type) {
      case 'coordination':
        return 'bg-blue-600/20 text-blue-300 border border-blue-600/30';
      case 'task_result':
        return 'bg-green-600/20 text-green-300 border border-green-600/30';
      default:
        return message.sender === 'user'
          ? 'bg-purple-600 text-white'
          : message.sender === 'system'
          ? 'bg-gray-700 text-gray-200'
          : 'bg-gray-700 text-white';
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Smart Agent Chat</h3>
              <p className="text-sm text-gray-400">
                {currentAnalysis ? 
                  `${activeAgents.length} agent(s) active • ${currentAnalysis.category} task` :
                  'AI-powered multi-agent coordination'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {currentAnalysis && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-lg transition-colors ${
                showSidebar ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <Users className="w-5 h-5" />
            </button>
          )}
          {activeAgents.length > 0 && (
            <div className="flex items-center space-x-1">
              {activeAgents.slice(0, 3).map(agentId => {
                const agent = agents.find(a => a.id === agentId);
                return agent ? (
                  <div key={agentId} className="text-lg" title={agent.name}>
                    {agent.avatar}
                  </div>
                ) : null;
              })}
              {activeAgents.length > 3 && (
                <span className="text-xs text-gray-400">+{activeAgents.length - 3}</span>
              )}
            </div>
          )}
        </div>
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
                  message.sender === 'user' ? 'bg-purple-600' : 
                  message.type === 'coordination' ? 'bg-blue-600' :
                  message.type === 'task_result' ? 'bg-green-600' :
                  'bg-gray-700'
                }`}>
                  {getMessageIcon(message)}
                </div>
                <div className={`rounded-lg p-3 ${getMessageStyle(message)}`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    {message.agentId && (
                      <span className="text-xs opacity-70">
                        {agents.find(a => a.id === message.agentId)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-3">
              <Loader className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-sm text-gray-300">Analyzing and coordinating agents...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for NFT creation, DeFi advice, wallet help, or anything else..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dynamic Sidebar */}
      <DynamicAgentSidebar
        currentAnalysis={currentAnalysis}
        onAgentSelect={handleAgentSelect}
        isVisible={showSidebar}
      />
    </div>
  );
}; 