import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Copy, Eye, EyeOff, RefreshCw, Plus, Trash2, Star, ExternalLink } from 'lucide-react';
import { tatumService } from '../services/tatumService';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { useAgentStore } from '../stores/agentStore';
import { walletSyncService } from '../services/walletSync';

interface UserWallet {
  id: string;
  address: string;
  private_key: string;
  mnemonic: string;
  network: string;
  wallet_type: 'solana' | 'ethereum';
  name: string;
  is_primary: boolean;
  balance: number;
  last_sync: string;
  created_at: string;
}

export const WalletManager: React.FC = () => {
  const { currentUser } = useSupabaseUserStore();
  const { addMessage, setAgentStatus } = useAgentStore();
  
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'solana' | 'ethereum'>('solana');

  useEffect(() => {
    if (currentUser) {
      loadUserWallets();
      
      // Subscribe to wallet sync events for real-time updates
      const unsubscribe = walletSyncService.subscribe(() => {
        // Reload wallets when any wallet operation occurs
        loadUserWallets();
      });
      
      return unsubscribe;
    }
  }, [currentUser]);

  const loadUserWallets = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const userWallets = await walletSyncService.getUserWallets(currentUser.id);
      setWallets(userWallets);
      
      // Select primary wallet or first wallet
      const primaryWallet = userWallets.find(w => w.is_primary);
      setSelectedWallet(primaryWallet || userWallets[0] || null);
    } catch (error) {
      console.error('Error loading wallets:', error);
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Failed to load wallets',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewWallet = async (type: 'solana' | 'ethereum') => {
    if (!currentUser) return;
    
    setCreating(true);
    setAgentStatus('wallet-wizard', 'processing');
    
    addMessage({
      agentId: 'wallet-wizard',
      content: `Creating new ${type} wallet with Tatum...`,
      type: 'task'
    });

    try {
      // Use wallet sync service for consistent wallet creation
      const savedWallet = await walletSyncService.createWallet(currentUser.id, type);
      
      addMessage({
        agentId: 'wallet-wizard',
        content: `✅ ${type} wallet created successfully: ${savedWallet.address.slice(0, 8)}...\n💾 Saved as: ${savedWallet.name}`,
        type: 'completion'
      });
      
      // Wallet sync service will automatically notify all components
      
      setAgentStatus('wallet-wizard', 'idle');
    } catch (error) {
      console.error('Error creating wallet:', error);
      addMessage({
        agentId: 'wallet-wizard',
        content: `Failed to create ${type} wallet`,
        type: 'error'
      });
      setAgentStatus('wallet-wizard', 'error');
    } finally {
      setCreating(false);
    }
  };

  const syncWalletBalance = async (wallet: UserWallet) => {
    setSyncing(wallet.id);
    
    try {
      await walletSyncService.syncWalletBalance(wallet.id, currentUser!.id);
      
      addMessage({
        agentId: 'wallet-wizard',
        content: `✅ Balance synced for ${wallet.name}`,
        type: 'info'
      });
      
      // Wallet sync service will automatically notify all components
    } catch (error) {
      console.error('Error syncing balance:', error);
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Failed to sync balance',
        type: 'error'
      });
    } finally {
      setSyncing(null);
    }
  };

  const setPrimaryWallet = async (wallet: UserWallet) => {
    try {
      await walletSyncService.setPrimaryWallet(currentUser!.id, wallet.id);
      
      addMessage({
        agentId: 'wallet-wizard',
        content: `✅ ${wallet.name} set as primary wallet`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Failed to set primary wallet',
        type: 'error'
      });
    }
  };

  const deleteWallet = async (wallet: UserWallet) => {
    if (wallet.is_primary) {
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Cannot delete primary wallet',
        type: 'error'
      });
      return;
    }
    
    try {
      await walletSyncService.deleteWallet(currentUser!.id, wallet.id);
      
      addMessage({
        agentId: 'wallet-wizard',
        content: `✅ ${wallet.name} deleted`,
        type: 'info'
      });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      addMessage({
        agentId: 'wallet-wizard',
        content: 'Failed to delete wallet',
        type: 'error'
      });
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    addMessage({
      agentId: 'wallet-wizard',
      content: `${type} copied to clipboard`,
      type: 'info'
    });
  };

  const openExplorer = (address: string, network: string) => {
    let explorerUrl = '';
    
    if (network.includes('solana')) {
      explorerUrl = `https://explorer.solana.com/address/${address}${network.includes('devnet') ? '?cluster=devnet' : ''}`;
    } else if (network.includes('ethereum')) {
      explorerUrl = `https://etherscan.io/address/${address}`;
    }
    
    if (explorerUrl) {
      window.open(explorerUrl, '_blank');
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <p className="text-gray-400">Please log in to manage your wallets</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Wallet className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Tatum Wallet Manager</h2>
        </div>
        <div className="flex space-x-2">
          <select
            value={walletType}
            onChange={(e) => setWalletType(e.target.value as 'solana' | 'ethereum')}
            className="bg-gray-700 text-white px-3 py-1 rounded-lg border border-gray-600 text-sm"
          >
            <option value="solana">Solana</option>
            <option value="ethereum">Ethereum</option>
          </select>
          <button
            onClick={() => createNewWallet(walletType)}
            disabled={creating}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{creating ? 'Creating...' : 'Create Wallet'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Wallet List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => (
              <motion.div
                key={wallet.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedWallet?.id === wallet.id
                    ? 'border-purple-500 bg-purple-600/10'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
                onClick={() => setSelectedWallet(wallet)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{wallet.name}</span>
                  <div className="flex items-center space-x-1">
                    {wallet.is_primary && (
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      wallet.wallet_type === 'solana' 
                        ? 'bg-purple-600/20 text-purple-300' 
                        : 'bg-blue-600/20 text-blue-300'
                    }`}>
                      {wallet.wallet_type}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-400 mb-2">
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">
                    {wallet.balance?.toFixed(4) || '0.0000'} {wallet.wallet_type === 'solana' ? 'SOL' : 'ETH'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      syncWalletBalance(wallet);
                    }}
                    disabled={syncing === wallet.id}
                    className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing === wallet.id ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Selected Wallet Details */}
          {selectedWallet && (
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">{selectedWallet.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openExplorer(selectedWallet.address, selectedWallet.network)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="View in Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPrimaryWallet(selectedWallet)}
                    disabled={selectedWallet.is_primary}
                    className="p-2 text-gray-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                    title="Set as Primary"
                  >
                    <Star className={`w-4 h-4 ${selectedWallet.is_primary ? 'text-yellow-400 fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => deleteWallet(selectedWallet)}
                    disabled={selectedWallet.is_primary}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete Wallet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Address */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-700 px-3 py-1 rounded text-sm text-green-400 flex-1">
                      {selectedWallet.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.address, 'Address')}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Private Key */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Private Key</p>
                    <button
                      onClick={() => setShowPrivateKey(
                        showPrivateKey === selectedWallet.id ? null : selectedWallet.id
                      )}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      {showPrivateKey === selectedWallet.id ? 
                        <EyeOff className="w-4 h-4" /> : 
                        <Eye className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-700 px-3 py-1 rounded text-sm text-yellow-400 flex-1">
                      {showPrivateKey === selectedWallet.id 
                        ? selectedWallet.private_key 
                        : '••••••••••••••••••••••••••••••••'
                      }
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.private_key, 'Private Key')}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Mnemonic */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Mnemonic Phrase</p>
                    <button
                      onClick={() => setShowMnemonic(
                        showMnemonic === selectedWallet.id ? null : selectedWallet.id
                      )}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      {showMnemonic === selectedWallet.id ? 
                        <EyeOff className="w-4 h-4" /> : 
                        <Eye className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-700 px-3 py-1 rounded text-sm text-blue-400 flex-1">
                      {showMnemonic === selectedWallet.id 
                        ? selectedWallet.mnemonic 
                        : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'
                      }
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.mnemonic, 'Mnemonic')}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Network Info */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Network</p>
                      <p className="text-white">{selectedWallet.network}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Environment</p>
                      <p className="text-white">{tatumService.getEnvironment()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {wallets.length === 0 && (
            <div className="text-center py-8">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No wallets created yet</p>
              <p className="text-gray-500 text-sm">Create your first wallet to get started</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};