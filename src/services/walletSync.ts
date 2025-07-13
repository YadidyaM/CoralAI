// Wallet Synchronization Service
// Ensures wallet keys and data are consistent across all dashboard components

import { supabaseService } from './supabaseService';
import { tatumService } from './tatumService';

interface WalletSyncEvent {
  type: 'wallet_created' | 'wallet_updated' | 'wallet_deleted' | 'balance_updated';
  walletId: string;
  data?: any;
}

class WalletSyncService {
  private listeners: Array<(event: WalletSyncEvent) => void> = [];
  private userWalletsCache: Map<string, any[]> = new Map();

  // Subscribe to wallet sync events
  subscribe(listener: (event: WalletSyncEvent) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of wallet changes
  private notify(event: WalletSyncEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // Get user wallets with caching
  async getUserWallets(userId: string, forceRefresh: boolean = false): Promise<any[]> {
    if (!forceRefresh && this.userWalletsCache.has(userId)) {
      return this.userWalletsCache.get(userId)!;
    }

    try {
      const wallets = await supabaseService.getUserWallets(userId);
      this.userWalletsCache.set(userId, wallets);
      return wallets;
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      return [];
    }
  }

  // Create wallet and sync across components
  async createWallet(userId: string, type: 'solana' | 'ethereum'): Promise<any> {
    try {
      // Create wallet using Tatum
      const newWallet = type === 'ethereum' 
        ? await tatumService.createEthereumWallet()
        : await tatumService.createSolanaWallet();
      
      // Get existing wallets to determine naming
      const existingWallets = await this.getUserWallets(userId, true);
      const walletsOfType = existingWallets.filter(w => w.wallet_type === type);
      const walletName = `${type.charAt(0).toUpperCase() + type.slice(1)} Wallet ${walletsOfType.length + 1}`;
      
      // Save to database
      const savedWallet = await supabaseService.createUserWallet({
        user_id: userId,
        address: newWallet.address,
        private_key: newWallet.privateKey,
        mnemonic: newWallet.mnemonic,
        network: newWallet.network,
        wallet_type: type,
        name: walletName,
        is_primary: walletsOfType.length === 0 // First wallet of type is primary
      });

      // Update cache
      this.userWalletsCache.delete(userId);
      
      // Notify all components
      this.notify({
        type: 'wallet_created',
        walletId: savedWallet.id,
        data: { savedWallet, newWallet }
      });

      return savedWallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  // Update wallet and sync across components
  async updateWallet(walletId: string, updates: any): Promise<any> {
    try {
      const updatedWallet = await supabaseService.updateUserWallet(walletId, updates);
      
      // Clear cache for the user
      for (const [userId, wallets] of this.userWalletsCache.entries()) {
        if (wallets.some(w => w.id === walletId)) {
          this.userWalletsCache.delete(userId);
          break;
        }
      }
      
      // Notify all components
      this.notify({
        type: 'wallet_updated',
        walletId: walletId,
        data: updatedWallet
      });

      return updatedWallet;
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  }

  // Delete wallet and sync across components
  async deleteWallet(userId: string, walletId: string): Promise<void> {
    try {
      await supabaseService.deleteUserWallet(walletId);
      
      // Update cache
      this.userWalletsCache.delete(userId);
      
      // Notify all components
      this.notify({
        type: 'wallet_deleted',
        walletId: walletId
      });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      throw error;
    }
  }

  // Set primary wallet and sync across components
  async setPrimaryWallet(userId: string, walletId: string): Promise<any> {
    try {
      const updatedWallet = await supabaseService.setPrimaryWallet(userId, walletId);
      
      // Update cache
      this.userWalletsCache.delete(userId);
      
      // Notify all components
      this.notify({
        type: 'wallet_updated',
        walletId: walletId,
        data: updatedWallet
      });

      return updatedWallet;
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      throw error;
    }
  }

  // Sync wallet balance and notify components
  async syncWalletBalance(walletId: string, userId: string): Promise<void> {
    try {
      const wallets = await this.getUserWallets(userId, true);
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Get balance from Tatum
      const balance = wallet.wallet_type === 'solana' 
        ? await tatumService.getSolanaBalance(wallet.address)
        : await tatumService.getEthereumBalance(wallet.address);

      // Update in database
      await supabaseService.syncWalletBalances(walletId, balance);
      
      // Update cache
      this.userWalletsCache.delete(userId);
      
      // Notify all components
      this.notify({
        type: 'balance_updated',
        walletId: walletId,
        data: { balance }
      });
    } catch (error) {
      console.error('Error syncing wallet balance:', error);
      throw error;
    }
  }

  // Get primary wallet for a user
  async getPrimaryWallet(userId: string, walletType?: 'solana' | 'ethereum'): Promise<any | null> {
    const wallets = await this.getUserWallets(userId);
    
    if (walletType) {
      return wallets.find(w => w.is_primary && w.wallet_type === walletType) || null;
    }
    
    return wallets.find(w => w.is_primary) || wallets[0] || null;
  }

  // Clear cache for a user (useful when user logs out)
  clearUserCache(userId: string): void {
    this.userWalletsCache.delete(userId);
  }

  // Clear all cache
  clearAllCache(): void {
    this.userWalletsCache.clear();
  }
}

// Export singleton instance
export const walletSyncService = new WalletSyncService(); 