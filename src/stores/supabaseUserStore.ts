import { create } from 'zustand';
import { supabaseService } from '../services/supabaseService';

// testnet user for development when Supabase isn't configured
const testnet_USER = {
  id: 'testnet-user-123',
  email: 'testnet@example.com',
  name: 'testnet User',
  wallet_address: null,
  avatar: null,
  onboarding_step: 5,
  onboarding_completed: true,
  risk_tolerance: 'medium' as const,
  investment_goals: ['yield_farming', 'nft_trading'],
  notifications: true,
  total_transactions: 12,
  total_volume: 1500,
  favorite_agent: 'defi-agent',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

interface SupabaseUserStore {
  currentUser: any | null;
  loading: boolean;
  error: string | null;
  
  // Auth
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  
  // User management
  updateUser: (updates: any) => Promise<void>;
  
  // Onboarding
  initializeOnboarding: () => Promise<void>;
  completeOnboardingStep: (stepId: number) => Promise<void>;
  getOnboardingSteps: () => Promise<any[]>;
  
  // Feedback
  submitFeedback: (feedback: any) => Promise<void>;
  getFeedback: () => Promise<any[]>;
  getTestimonials: () => Promise<any[]>;
  
  // Portfolio
  getPortfolio: () => Promise<any>;
  updatePortfolio: (portfolioData: any) => Promise<void>;
  
  // Messages
  saveMessage: (message: any) => Promise<void>;
  getMessages: (agentId?: string) => Promise<any[]>;
  subscribeToMessages: (callback: (message: any) => void) => any;
  
  // Coordination
  logCoordination: (log: any) => Promise<void>;
  getCoordinationLogs: () => Promise<any[]>;
  subscribeToCoordination: (callback: (log: any) => void) => any;
  
  // Wallet management
  createWallet: (walletData: any) => Promise<any>;
  getUserWallets: (walletType?: 'solana' | 'ethereum') => Promise<any[]>;
  updateWallet: (walletId: string, updates: any) => Promise<void>;
  deleteWallet: (walletId: string) => Promise<void>;
  setPrimaryWallet: (walletId: string) => Promise<void>;
  syncWalletBalance: (walletId: string, balance: number) => Promise<void>;
  
  // NFT management
  createNFT: (nftData: any) => Promise<any>;
  getUserNFTs: (walletId?: string) => Promise<any[]>;
  updateNFT: (nftId: string, updates: any) => Promise<void>;
  deleteNFT: (nftId: string) => Promise<void>;
  
  // Asset portfolio
  getAssetPortfolio: () => Promise<any>;
}

export const useSupabaseUserStore = create<SupabaseUserStore>((set, get) => ({
  currentUser: import.meta.env.VITE_SUPABASE_URL ? null : testnet_USER,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  signUp: async (email: string, password: string, userData: any) => {
    set({ loading: true, error: null });
    try {
      // First, sign up with Supabase Auth
      const { data: authData, error: authError } = await supabaseService.signUp(email, password);
      
      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile in database
      const user = await supabaseService.createUser({
        ...userData,
        email,
        id: authData.user.id
      });

      set({ currentUser: user });
      
      // Initialize onboarding for new user
      await get().initializeOnboarding();
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      set({ error: error.message || 'Registration failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      // Sign in with Supabase Auth
      const authData = await supabaseService.signIn(email, password);
      
      if (!authData.user) {
        throw new Error('Authentication failed');
      }

      // Get user profile from database
      let user = await supabaseService.getUser(authData.user.id);
      
      // If no profile exists, create one automatically
      if (!user) {
        console.log('No user profile found, creating default profile...');
        user = await supabaseService.createUser({
          id: authData.user.id,
          email: authData.user.email || email,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          wallet_address: null,
          avatar: null,
          onboarding_step: 0,
          onboarding_completed: false,
          risk_tolerance: 'medium',
          investment_goals: [],
          notifications: true,
          total_transactions: 0,
          total_volume: 0,
          favorite_agent: null
        });
        
        // Initialize onboarding for the newly created profile
        await supabaseService.initializeOnboarding(user.id);
      }

      set({ currentUser: user });
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await supabaseService.signOut();
      set({ currentUser: null });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: error.message || 'Sign out failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (updates: any) => {
    const { currentUser } = get();
    if (!currentUser) return;

    set({ loading: true, error: null });
    try {
      const updatedUser = await supabaseService.updateUser(currentUser.id, updates);
      set({ currentUser: updatedUser });
    } catch (error: any) {
      console.error('Update user error:', error);
      set({ error: error.message || 'Failed to update user' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  initializeOnboarding: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabaseService.initializeOnboarding(currentUser.id);
    } catch (error: any) {
      console.error('Initialize onboarding error:', error);
      set({ error: error.message || 'Failed to initialize onboarding' });
      throw error;
    }
  },

  completeOnboardingStep: async (stepId: number) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabaseService.completeOnboardingStep(currentUser.id, stepId);
      
      // Update user's onboarding progress
      const steps = await get().getOnboardingSteps();
      const completedSteps = steps.filter(s => s.completed).length;
      const allCompleted = completedSteps === steps.length;
      
      await get().updateUser({
        onboarding_step: Math.max(currentUser.onboarding_step, stepId),
        onboarding_completed: allCompleted
      });
    } catch (error: any) {
      console.error('Complete onboarding step error:', error);
      set({ error: error.message || 'Failed to complete onboarding step' });
      throw error;
    }
  },

  getOnboardingSteps: async () => {
    const { currentUser } = get();
    if (!currentUser) return [];

    try {
      return await supabaseService.getOnboardingSteps(currentUser.id);
    } catch (error: any) {
      console.error('Get onboarding steps error:', error);
      set({ error: error.message || 'Failed to get onboarding steps' });
      return [];
    }
  },

  submitFeedback: async (feedback: any) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabaseService.submitFeedback({
        ...feedback,
        user_id: currentUser.id
      });
    } catch (error: any) {
      console.error('Submit feedback error:', error);
      set({ error: error.message || 'Failed to submit feedback' });
      throw error;
    }
  },

  getFeedback: async () => {
    const { currentUser } = get();
    if (!currentUser) return [];

    try {
      return await supabaseService.getFeedback(currentUser.id);
    } catch (error: any) {
      console.error('Get feedback error:', error);
      set({ error: error.message || 'Failed to get feedback' });
      return [];
    }
  },

  getTestimonials: async () => {
    try {
      return await supabaseService.getTestimonials();
    } catch (error: any) {
      console.error('Get testimonials error:', error);
      set({ error: error.message || 'Failed to get testimonials' });
      return [];
    }
  },

  getPortfolio: async () => {
    const { currentUser } = get();
    if (!currentUser) return null;

    try {
      return await supabaseService.getPortfolio(currentUser.id);
    } catch (error: any) {
      console.error('Get portfolio error:', error);
      set({ error: error.message || 'Failed to get portfolio' });
      return null;
    }
  },

  updatePortfolio: async (portfolioData: any) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabaseService.updatePortfolio(currentUser.id, portfolioData);
    } catch (error: any) {
      console.error('Update portfolio error:', error);
      set({ error: error.message || 'Failed to update portfolio' });
      throw error;
    }
  },

  saveMessage: async (message: any) => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      await supabaseService.saveMessage({
        ...message,
        user_id: currentUser.id
      });
    } catch (error: any) {
      console.error('Save message error:', error);
      set({ error: error.message || 'Failed to save message' });
      throw error;
    }
  },

  getMessages: async (agentId?: string) => {
    const { currentUser } = get();
    if (!currentUser) return [];

    try {
      return await supabaseService.getMessages(currentUser.id, agentId);
    } catch (error: any) {
      console.error('Get messages error:', error);
      set({ error: error.message || 'Failed to get messages' });
      return [];
    }
  },

  subscribeToMessages: (callback: (message: any) => void) => {
    const { currentUser } = get();
    if (!currentUser) return null;

    return supabaseService.subscribeToMessages(currentUser.id, callback);
  },

  logCoordination: async (log: any) => {
    const { currentUser } = get();
    
    try {
      await supabaseService.logCoordination({
        ...log,
        user_id: currentUser?.id
      });
    } catch (error: any) {
      console.error('Log coordination error:', error);
      set({ error: error.message || 'Failed to log coordination' });
      throw error;
    }
  },

  getCoordinationLogs: async () => {
    const { currentUser } = get();
    
    try {
      return await supabaseService.getCoordinationLogs(currentUser?.id);
    } catch (error: any) {
      console.error('Get coordination logs error:', error);
      set({ error: error.message || 'Failed to get coordination logs' });
      return [];
    }
  },

  subscribeToCoordination: (callback: (log: any) => void) => {
    return supabaseService.subscribeToCoordination(callback);
  },

  // Wallet management
  createWallet: async (walletData: any) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user authenticated');

    try {
      const wallet = await supabaseService.createUserWallet({
        ...walletData,
        user_id: currentUser.id
      });
      return wallet;
    } catch (error: any) {
      console.error('Create wallet error:', error);
      set({ error: error.message || 'Failed to create wallet' });
      throw error;
    }
  },

  getUserWallets: async (walletType?: 'solana' | 'ethereum') => {
    const { currentUser } = get();
    if (!currentUser) return [];

    try {
      return await supabaseService.getUserWallets(currentUser.id, walletType);
    } catch (error: any) {
      console.error('Get user wallets error:', error);
      set({ error: error.message || 'Failed to get wallets' });
      return [];
    }
  },

  updateWallet: async (walletId: string, updates: any) => {
    try {
      await supabaseService.updateUserWallet(walletId, updates);
    } catch (error: any) {
      console.error('Update wallet error:', error);
      set({ error: error.message || 'Failed to update wallet' });
      throw error;
    }
  },

  deleteWallet: async (walletId: string) => {
    try {
      await supabaseService.deleteUserWallet(walletId);
    } catch (error: any) {
      console.error('Delete wallet error:', error);
      set({ error: error.message || 'Failed to delete wallet' });
      throw error;
    }
  },

  setPrimaryWallet: async (walletId: string) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user authenticated');

    try {
      await supabaseService.setPrimaryWallet(currentUser.id, walletId);
    } catch (error: any) {
      console.error('Set primary wallet error:', error);
      set({ error: error.message || 'Failed to set primary wallet' });
      throw error;
    }
  },

  syncWalletBalance: async (walletId: string, balance: number) => {
    try {
      await supabaseService.syncWalletBalances(walletId, balance);
    } catch (error: any) {
      console.error('Sync wallet balance error:', error);
      set({ error: error.message || 'Failed to sync wallet balance' });
      throw error;
    }
  },

  // NFT management
  createNFT: async (nftData: any) => {
    const { currentUser } = get();
    if (!currentUser) throw new Error('No user authenticated');

    try {
      const nft = await supabaseService.createUserNFT({
        ...nftData,
        user_id: currentUser.id
      });
      return nft;
    } catch (error: any) {
      console.error('Create NFT error:', error);
      set({ error: error.message || 'Failed to create NFT' });
      throw error;
    }
  },

  getUserNFTs: async (walletId?: string) => {
    const { currentUser } = get();
    if (!currentUser) return [];

    try {
      return await supabaseService.getUserNFTs(currentUser.id, walletId);
    } catch (error: any) {
      console.error('Get user NFTs error:', error);
      set({ error: error.message || 'Failed to get NFTs' });
      return [];
    }
  },

  updateNFT: async (nftId: string, updates: any) => {
    try {
      await supabaseService.updateUserNFT(nftId, updates);
    } catch (error: any) {
      console.error('Update NFT error:', error);
      set({ error: error.message || 'Failed to update NFT' });
      throw error;
    }
  },

  deleteNFT: async (nftId: string) => {
    try {
      await supabaseService.deleteUserNFT(nftId);
    } catch (error: any) {
      console.error('Delete NFT error:', error);
      set({ error: error.message || 'Failed to delete NFT' });
      throw error;
    }
  },

  // Asset portfolio
  getAssetPortfolio: async () => {
    const { currentUser } = get();
    if (!currentUser) return null;

    try {
      return await supabaseService.getUserAssetPortfolio(currentUser.id);
    } catch (error: any) {
      console.error('Get asset portfolio error:', error);
      set({ error: error.message || 'Failed to get asset portfolio' });
      return null;
    }
  }
}));