import { supabase } from '../lib/supabase';

export class SupabaseService {
  // Authentication
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Subscribe to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // User Management
  async createUser(userData: {
    email: string;
    name: string;
    id: string;
    wallet_address?: string;
    risk_tolerance?: 'low' | 'medium' | 'high';
    investment_goals?: string[];
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateUser(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Agent Messages
  async saveMessage(message: {
    user_id: string;
    agent_id: string;
    message: string;
    response?: string;
    message_type?: 'user' | 'agent' | 'coordination';
  }) {
    const { data, error } = await supabase
      .from('agent_messages')
      .insert([message])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMessages(userId: string, agentId?: string) {
    let query = supabase
      .from('agent_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Real-time message subscription
  subscribeToMessages(userId: string, callback: (message: any) => void) {
    return supabase
      .channel('agent_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  // Feedback
  async submitFeedback(feedback: {
    user_id: string;
    type: 'rating' | 'suggestion' | 'bug' | 'testimonial';
    rating?: number;
    title: string;
    content: string;
    agent_id?: string;
    feature?: string;
  }) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedback])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFeedback(userId?: string) {
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Get testimonials (high-rated feedback)
  async getTestimonials() {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        users!inner(name, avatar)
      `)
      .eq('type', 'testimonial')
      .gte('rating', 4)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Onboarding Steps
  async initializeOnboarding(userId: string) {
    const defaultSteps = [
      {
        user_id: userId,
        step_id: 1,
        step_title: 'Welcome to Solana AI Agents',
        step_description: 'Learn about our intelligent agent system',
        agent_id: 'onboarding-guide'
      },
      {
        user_id: userId,
        step_id: 2,
        step_title: 'Create Your Wallet',
        step_description: 'Set up a secure Solana wallet',
        agent_id: 'wallet-wizard'
      },
      {
        user_id: userId,
        step_id: 3,
        step_title: 'Explore DeFi Opportunities',
        step_description: 'Discover yield farming and staking options',
        agent_id: 'defi-scout'
      },
      {
        user_id: userId,
        step_id: 4,
        step_title: 'Create Your First NFT',
        step_description: 'Generate and mint an AI-powered NFT',
        agent_id: 'nft-creator'
      },
      {
        user_id: userId,
        step_id: 5,
        step_title: 'Start Earning Rewards',
        step_description: 'Begin staking and earning passive income',
        agent_id: 'staking-agent'
      }
    ];

    const { data, error } = await supabase
      .from('onboarding_steps')
      .insert(defaultSteps)
      .select();

    if (error) throw error;
    return data;
  }

  async getOnboardingSteps(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('user_id', userId)
      .order('step_id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async completeOnboardingStep(userId: string, stepId: number) {
    const { data, error } = await supabase
      .from('onboarding_steps')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('step_id', stepId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Portfolio
  async getPortfolio(userId: string) {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updatePortfolio(userId: string, portfolioData: any) {
    const { data, error } = await supabase
      .from('portfolios')
      .upsert({
        user_id: userId,
        ...portfolioData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Coordination Logs
  async logCoordination(log: {
    from_agent: string;
    to_agent: string;
    message_type: string;
    payload: any;
    user_id?: string;
  }) {
    const { data, error } = await supabase
      .from('coordination_logs')
      .insert([log])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCoordinationLogs(userId?: string, limit = 50) {
    let query = supabase
      .from('coordination_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Real-time coordination subscription
  subscribeToCoordination(callback: (log: any) => void) {
    return supabase
      .channel('coordination_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coordination_logs'
        },
        callback
      )
      .subscribe();
  }

  // ============= WALLET MANAGEMENT =============

  async createUserWallet(walletData: {
    user_id: string;
    address: string;
    private_key: string;
    mnemonic: string;
    network: string;
    wallet_type: 'solana' | 'ethereum';
    name?: string;
    is_primary?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .insert([{
          ...walletData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase not available, using testnet mode:', error);
      // Return testnet wallet data for development
      return {
        id: 'testnet-wallet-' + Math.random().toString(36).substr(2, 9),
        user_id: walletData.user_id,
        address: walletData.address,
        private_key: walletData.private_key,
        mnemonic: walletData.mnemonic,
        network: walletData.network,
        wallet_type: walletData.wallet_type,
        name: walletData.name || 'testnet Wallet',
        is_primary: walletData.is_primary || false,
        balance: 0,
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  async getUserWallets(userId: string, walletType?: 'solana' | 'ethereum') {
    try {
      let query = supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (walletType) {
        query = query.eq('wallet_type', walletType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Supabase not available, using testnet mode:', error);
      // Return testnet wallet data for development
      const testnetWallets = [
        {
          id: 'testnet-wallet-1',
          user_id: userId,
          address: 'testnetSolanaAddress123',
          private_key: 'testnet-private-key-123',
          mnemonic: 'testnet mnemonic phrase for development testing only',
          network: 'solana-devnet',
          wallet_type: 'solana' as const,
          name: 'testnet Solana Wallet',
          is_primary: true,
          balance: 5.0,
          last_sync: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'testnet-wallet-2',
          user_id: userId,
          address: '0xtestnetEthereumAddress456',
          private_key: 'testnet-private-key-456',
          mnemonic: 'testnet mnemonic phrase for development testing only',
          network: 'ethereum-sepolia',
          wallet_type: 'ethereum' as const,
          name: 'testnet Ethereum Wallet',
          is_primary: false,
          balance: 0.025,
          last_sync: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      return walletType ? testnetWallets.filter(w => w.wallet_type === walletType) : testnetWallets;
    }
  }

  async updateUserWallet(walletId: string, updates: {
    name?: string;
    is_primary?: boolean;
    balance?: number;
    last_sync?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase not available, using testnet mode:', error);
      // Return testnet updated wallet data
      return {
        id: walletId,
        ...updates,
        updated_at: new Date().toISOString()
      };
    }
  }

  async deleteUserWallet(walletId: string) {
    try {
      const { error } = await supabase
        .from('user_wallets')
        .delete()
        .eq('id', walletId);

      if (error) throw error;
    } catch (error) {
      console.warn('Supabase not available, using testnet mode:', error);
      // In testnet mode, deletion is just logged
    }
  }

  async setPrimaryWallet(userId: string, walletId: string) {
    try {
      // First, unset all primary wallets for this user
      await supabase
        .from('user_wallets')
        .update({ is_primary: false })
        .eq('user_id', userId);

      // Then set the selected wallet as primary
      const { data, error } = await supabase
        .from('user_wallets')
        .update({ is_primary: true })
        .eq('id', walletId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Supabase not available, using testnet mode:', error);
      // Return testnet primary wallet data
      return {
        id: walletId,
        user_id: userId,
        is_primary: true,
        updated_at: new Date().toISOString()
      };
    }
  }

  // ============= NFT MANAGEMENT =============

  async createUserNFT(nftData: {
    user_id: string;
    wallet_id: string;
    name: string;
    description: string;
    image_url: string;
    mint_address: string;
    token_id?: string;
    network: string;
    collection_address?: string;
    attributes?: any[];
    metadata?: any;
    transaction_hash: string;
  }) {
    const { data, error } = await supabase
      .from('user_nfts')
      .insert([{
        ...nftData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserNFTs(userId: string, walletId?: string) {
    let query = supabase
      .from('user_nfts')
      .select(`
        *,
        user_wallets(address, wallet_type, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (walletId) {
      query = query.eq('wallet_id', walletId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateUserNFT(nftId: string, updates: {
    name?: string;
    description?: string;
    image_url?: string;
    attributes?: any[];
    metadata?: any;
    is_favorited?: boolean;
  }) {
    const { data, error } = await supabase
      .from('user_nfts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', nftId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteUserNFT(nftId: string) {
    const { error } = await supabase
      .from('user_nfts')
      .delete()
      .eq('id', nftId);

    if (error) throw error;
  }

  async getNFTsByWallet(walletId: string) {
    const { data, error } = await supabase
      .from('user_nfts')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ============= ASSET PORTFOLIO =============

  async getUserAssetPortfolio(userId: string) {
    const { data, error } = await supabase
      .from('user_wallets')
      .select(`
        *,
        user_nfts(count)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  async syncWalletBalances(walletId: string, balance: number) {
    const { data, error } = await supabase
      .from('user_wallets')
      .update({
        balance: balance,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============= WALLET CONNECTIONS =============

  async saveWalletConnection(connectionData: {
    user_id: string;
    wallet_address: string;
    wallet_type: 'phantom' | 'metamask' | 'solflare' | 'backpack' | 'other';
    network: string;
    connection_method: 'extension' | 'walletconnect' | 'direct';
    is_active: boolean;
  }) {
    const { data, error } = await supabase
      .from('wallet_connections')
      .insert([{
        ...connectionData,
        connected_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWalletConnections(userId: string) {
    const { data, error } = await supabase
      .from('wallet_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateWalletConnection(connectionId: string, updates: {
    is_active?: boolean;
    last_active?: string;
  }) {
    const { data, error } = await supabase
      .from('wallet_connections')
      .update({
        ...updates,
        last_active: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async disconnectWallet(connectionId: string) {
    const { data, error } = await supabase
      .from('wallet_connections')
      .update({
        is_active: false,
        disconnected_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();