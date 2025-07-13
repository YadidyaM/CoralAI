import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Wallet, TrendingUp, Palette, Zap, BarChart3, MessageSquare, Brain } from 'lucide-react';
import { useAgentStore } from './stores/agentStore';
import { useSupabaseUserStore } from './stores/supabaseUserStore';
import { AgentCard } from './components/AgentCard';
import { MessageFeed } from './components/MessageFeed';
import { WalletManager } from './components/WalletManager';
import { DeFiInterface } from './components/DeFiInterface';
import EnhancedDeFiInterface from './components/EnhancedDeFiInterface';
import LiquidityPoolAnalytics from './components/LiquidityPoolAnalytics';
import PortfolioRebalancer from './components/PortfolioRebalancer';
import PortfolioDashboard from './components/PortfolioDashboard';
import PerformanceBenchmarking from './components/PerformanceBenchmarking';
import { NFTCreator } from './components/NFTCreator';
import { PortfolioAnalytics } from './components/PortfolioAnalytics';
import { SupabaseUserRegistration } from './components/SupabaseUserRegistration';
import { OnboardingTracker } from './components/OnboardingTracker';
import { TestimonialsSection } from './components/TestimonialsSection';
import { UserProfile } from './components/UserProfile';
import { FeedbackModal } from './components/FeedbackModal';
import { AgentsOverview } from './components/AgentsOverview';
import { SmartAgentChat } from './components/SmartAgentChat';
import { AgentStatusIndicator } from './components/AgentStatusIndicator';

type TabType = 'overview' | 'smartchat' | 'wallet' | 'defi' | 'enhanced-defi' | 'liquidity' | 'rebalancer' | 'portfolio' | 'performance' | 'nft' | 'analytics' | 'profile';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showFeedback, setShowFeedback] = useState(false);
  const { agents } = useAgentStore();
  const { currentUser } = useSupabaseUserStore();

  // Show registration if no user is logged in
  if (!currentUser) {
    return <SupabaseUserRegistration onComplete={() => setActiveTab('overview')} />;
  }

  const tabs = [
    { id: 'overview', label: 'Agents Overview', icon: Bot },
    { id: 'smartchat', label: 'Smart Chat', icon: Brain },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'defi', label: 'DeFi', icon: TrendingUp },
    { id: 'enhanced-defi', label: 'Enhanced DeFi', icon: TrendingUp },
    { id: 'liquidity', label: 'Liquidity Pools', icon: BarChart3 },
    { id: 'rebalancer', label: 'Portfolio Rebalancer', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio Dashboard', icon: BarChart3 },
    { id: 'performance', label: 'Performance Analytics', icon: TrendingUp },
    { id: 'nft', label: 'NFT Creator', icon: Palette },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Bot }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Solana AI Agents</h1>
                <p className="text-sm text-gray-400">Intelligent DeFi Coordination Platform</p>
              </div>
            </div>
            
            {/* Center - Agent Status Indicator */}
            <div className="hidden md:flex">
              <AgentStatusIndicator variant="compact" />
            </div>
            
            <div className="hidden sm:flex items-center space-x-4">
              <div className="bg-green-500/20 px-3 py-1 rounded-full">
                <span className="text-green-400 text-sm font-medium">Devnet Active</span>
              </div>
              {activeTab === 'smartchat' && (
                <div className="bg-purple-500/20 px-3 py-1 rounded-full">
                  <span className="text-purple-400 text-sm font-medium flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Smart Mode
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowFeedback(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Feedback</span>
              </button>
              <div className="text-white text-sm">
                Welcome, {currentUser.name || currentUser.email}
              </div>
            </div>
          </div>
          
          {/* Mobile Agent Status */}
          <div className="md:hidden pb-3">
            <AgentStatusIndicator variant="mini" />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'smartchat' && (
                    <div className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      NEW
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">AI Agent Coordination Hub</h2>
                  <p className="text-gray-400">
                    Your intelligent assistants working together to simplify Solana DeFi interactions.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>

                {/* Onboarding Progress */}
                {!currentUser.onboardingCompleted && (
                  <OnboardingTracker />
                )}

                {/* Testimonials */}
                <TestimonialsSection />

                {/* Quick Actions */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Start</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('smartchat')}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors text-left"
                    >
                      <Brain className="w-6 h-6 mb-2" />
                      <h4 className="font-medium">Try Smart Chat</h4>
                      <p className="text-sm opacity-80">AI-powered agent coordination</p>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('defi')}
                      className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors text-left"
                    >
                      <TrendingUp className="w-6 h-6 mb-2" />
                      <h4 className="font-medium">Explore DeFi</h4>
                      <p className="text-sm opacity-80">Find the best yield opportunities</p>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'smartchat' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[600px] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <SmartAgentChat />
              </motion.div>
            )}

            {activeTab === 'wallet' && <WalletManager />}
            {activeTab === 'defi' && <DeFiInterface />}
            {activeTab === 'enhanced-defi' && <EnhancedDeFiInterface />}
            {activeTab === 'liquidity' && <LiquidityPoolAnalytics />}
            {activeTab === 'rebalancer' && <PortfolioRebalancer />}
            {activeTab === 'portfolio' && <PortfolioDashboard onSendMessage={(message) => console.log('Message:', message)} />}
            {activeTab === 'performance' && <PerformanceBenchmarking onSendMessage={(message) => console.log('Message:', message)} />}
            {activeTab === 'nft' && <NFTCreator />}
            {activeTab === 'analytics' && <PortfolioAnalytics />}
            {activeTab === 'profile' && <UserProfile />}
          </div>

          {/* Right Column - Message Feed */}
          <div className="lg:col-span-1">
            <MessageFeed />
          </div>
        </div>
      </main>

      {/* Feedback Modal */}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}

export default App;