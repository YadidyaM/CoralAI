import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, MessageSquare, LogOut, Trophy, Wallet, Image, ExternalLink, Star, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { FeedbackModal } from './FeedbackModal';
import { supabaseService } from '../services/supabaseService';
import { tatumService } from '../services/tatumService';

export const UserProfile: React.FC = () => {
  const { currentUser, signOut, updateUser } = useSupabaseUserStore();
  const [showFeedback, setShowFeedback] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });
  const [activeTab, setActiveTab] = useState<'profile' | 'wallets' | 'nfts'>('profile');
  const [wallets, setWallets] = useState<any[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncingWallet, setSyncingWallet] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadUserAssets();
    }
  }, [currentUser]);

  const loadUserAssets = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Load wallets
      const userWallets = await supabaseService.getUserWallets(currentUser.id);
      setWallets(userWallets);
      
      // Load NFTs
      const userNFTs = await supabaseService.getUserNFTs(currentUser.id);
      setNfts(userNFTs);
      
      // Calculate portfolio stats
      const stats = {
        totalWallets: userWallets.length,
        totalNFTs: userNFTs.length,
        totalBalance: userWallets.reduce((sum, w) => sum + (w.balance || 0), 0),
        solanaWallets: userWallets.filter(w => w.wallet_type === 'solana').length,
        ethereumWallets: userWallets.filter(w => w.wallet_type === 'ethereum').length,
        favoriteNFTs: userNFTs.filter(n => n.is_favorited).length
      };
      setPortfolioStats(stats);
    } catch (error) {
      console.error('Error loading user assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncWalletBalance = async (wallet: any) => {
    setSyncingWallet(wallet.id);
    
    try {
      const balance = wallet.wallet_type === 'solana' 
        ? await tatumService.getSolanaBalance(wallet.address)
        : await tatumService.getEthereumBalance(wallet.address);
      
      await supabaseService.syncWalletBalances(wallet.id, balance);
      await loadUserAssets();
    } catch (error) {
      console.error('Error syncing balance:', error);
    } finally {
      setSyncingWallet(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getExplorerUrl = (address: string, network: string) => {
    if (network.includes('solana')) {
      return `https://explorer.solana.com/address/${address}${network.includes('devnet') ? '?cluster=devnet' : ''}`;
    } else if (network.includes('ethereum')) {
      return `https://etherscan.io/address/${address}`;
    }
    return '';
  };

  const getNFTExplorerUrl = (nft: any) => {
    if (nft.network.includes('solana')) {
      return `https://explorer.solana.com/address/${nft.mint_address}${nft.network.includes('devnet') ? '?cluster=devnet' : ''}`;
    } else if (nft.network.includes('ethereum')) {
      return `https://etherscan.io/nft/${nft.collection_address}/${nft.token_id}`;
    }
    return '';
  };

  const toggleNFTFavorite = async (nftId: string, currentStatus: boolean) => {
    try {
      await supabaseService.updateUserNFT(nftId, {
        is_favorited: !currentStatus
      });
      await loadUserAssets();
    } catch (error) {
      console.error('Error updating NFT favorite:', error);
    }
  };

  if (!currentUser) return null;

  const handleSave = () => {
    updateUser(editData);
    setEditing(false);
  };

  const achievements = [
    { 
      id: 'first-wallet', 
      name: 'First Wallet', 
      description: 'Created your first wallet',
      earned: portfolioStats?.totalWallets > 0,
      icon: '🔐'
    },
    { 
      id: 'nft-creator', 
      name: 'NFT Creator', 
      description: 'Minted your first NFT',
      earned: portfolioStats?.totalNFTs > 0,
      icon: '🎨'
    },
    { 
      id: 'collector', 
      name: 'Collector', 
      description: 'Own 5 or more NFTs',
      earned: portfolioStats?.totalNFTs >= 5,
      icon: '📦'
    },
    { 
      id: 'multi-chain', 
      name: 'Multi-Chain Master', 
      description: 'Have wallets on multiple networks',
      earned: portfolioStats?.solanaWallets > 0 && portfolioStats?.ethereumWallets > 0,
      icon: '🌐'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{currentUser.name}</h2>
            <p className="text-gray-400 text-sm">{currentUser.email}</p>
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-900 rounded-lg p-1">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'wallets', label: 'Wallets', icon: Wallet },
          { id: 'nfts', label: 'NFTs', icon: Image }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
      {editing ? (
            <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
              {/* Portfolio Stats */}
              {portfolioStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Wallets</p>
                    <p className="text-white font-medium">{portfolioStats.totalWallets}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">NFTs</p>
                    <p className="text-white font-medium">{portfolioStats.totalNFTs}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Balance</p>
                    <p className="text-white font-medium">{portfolioStats.totalBalance.toFixed(4)}</p>
                  </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-white font-medium">{new Date(currentUser.created_at).toLocaleDateString()}</p>
            </div>
            </div>
              )}

          {/* Achievements */}
              <div>
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Achievements</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border transition-all ${
                    achievement.earned
                      ? 'bg-yellow-900/20 border-yellow-700'
                      : 'bg-gray-900 border-gray-700 opacity-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{achievement.icon}</span>
                    <span className={`text-sm font-medium ${
                      achievement.earned ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {achievement.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
              <div>
            <h3 className="text-lg font-medium text-white mb-3">Preferences</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Risk Tolerance:</span>
                <span className="text-white capitalize">{currentUser.risk_tolerance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Investment Goals:</span>
                <span className="text-white">{currentUser.investment_goals?.length || 0} selected</span>
              </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Environment:</span>
                    <span className="text-white capitalize">{tatumService.getEnvironment()}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">My Wallets</h3>
            <button
              onClick={loadUserAssets}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{wallet.name}</span>
                      {wallet.is_primary && (
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      wallet.wallet_type === 'solana' 
                        ? 'bg-purple-600/20 text-purple-300' 
                        : 'bg-blue-600/20 text-blue-300'
                    }`}>
                      {wallet.wallet_type}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-white">
                        {wallet.balance?.toFixed(4) || '0.0000'} {wallet.wallet_type === 'solana' ? 'SOL' : 'ETH'}
                      </span>
                      <button
                        onClick={() => syncWalletBalance(wallet)}
                        disabled={syncingWallet === wallet.id}
                        className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingWallet === wallet.id ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    <div className="text-sm text-gray-400">
                      {wallet.address.slice(0, 12)}...{wallet.address.slice(-12)}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(wallet.address)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-lg transition-colors text-sm"
                      >
                        Copy Address
                      </button>
                      <button
                        onClick={() => setShowPrivateKey(
                          showPrivateKey === wallet.id ? null : wallet.id
                        )}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPrivateKey === wallet.id ? 
                          <EyeOff className="w-4 h-4" /> : 
                          <Eye className="w-4 h-4" />
                        }
                      </button>
                      <a
                        href={getExplorerUrl(wallet.address, wallet.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {showPrivateKey === wallet.id && (
                      <div className="bg-gray-800 rounded-lg p-3 mt-2">
                        <p className="text-gray-400 text-xs mb-1">Private Key</p>
                        <code className="text-yellow-400 text-xs break-all">
                          {wallet.private_key}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {wallets.length === 0 && !loading && (
            <div className="text-center py-8">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No wallets found</p>
              <p className="text-gray-500 text-sm">Create your first wallet to get started</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">My NFT Collection</h3>
            <button
              onClick={loadUserAssets}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nfts.map((nft) => (
                <div
                  key={nft.id}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-700"
                >
                  <div className="relative mb-3">
                    <img
                      src={nft.image_url}
                      alt={nft.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => toggleNFTFavorite(nft.id, nft.is_favorited)}
                      className="absolute top-2 right-2 p-1 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${nft.is_favorited ? 'text-yellow-400 fill-current' : 'text-gray-400'}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium truncate">{nft.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        nft.user_wallets?.wallet_type === 'solana' 
                          ? 'bg-purple-600/20 text-purple-300' 
                          : 'bg-blue-600/20 text-blue-300'
                      }`}>
                        {nft.user_wallets?.wallet_type || 'unknown'}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-sm line-clamp-2">{nft.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">
                        {nft.user_wallets?.name || 'Unknown Wallet'}
                      </span>
                      <a
                        href={getNFTExplorerUrl(nft)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    
                    {nft.attributes && nft.attributes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {nft.attributes.slice(0, 3).map((attr: any, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
                          >
                            {attr.trait_type}: {attr.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nfts.length === 0 && !loading && (
            <div className="text-center py-8">
              <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No NFTs found</p>
              <p className="text-gray-500 text-sm">Create your first NFT to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 mt-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFeedback(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Give Feedback</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </motion.button>
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        feature="General Platform"
      />
    </motion.div>
  );
};