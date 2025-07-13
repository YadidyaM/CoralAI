import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://testnet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'testnet-key';

// For development, we'll use testnet values if env vars are missing
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('Missing VITE_SUPABASE_URL - using testnet configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          wallet_address: string | null;
          avatar: string | null;
          onboarding_step: number;
          onboarding_completed: boolean;
          risk_tolerance: 'low' | 'medium' | 'high';
          investment_goals: string[];
          notifications: boolean;
          total_transactions: number;
          total_volume: number;
          favorite_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          wallet_address?: string | null;
          avatar?: string | null;
          onboarding_step?: number;
          onboarding_completed?: boolean;
          risk_tolerance?: 'low' | 'medium' | 'high';
          investment_goals?: string[];
          notifications?: boolean;
          total_transactions?: number;
          total_volume?: number;
          favorite_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          wallet_address?: string | null;
          avatar?: string | null;
          onboarding_step?: number;
          onboarding_completed?: boolean;
          risk_tolerance?: 'low' | 'medium' | 'high';
          investment_goals?: string[];
          notifications?: boolean;
          total_transactions?: number;
          total_volume?: number;
          favorite_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_messages: {
        Row: {
          id: string;
          user_id: string;
          agent_id: string;
          message: string;
          response: string | null;
          message_type: 'user' | 'agent' | 'coordination';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          agent_id: string;
          message: string;
          response?: string | null;
          message_type?: 'user' | 'agent' | 'coordination';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          agent_id?: string;
          message?: string;
          response?: string | null;
          message_type?: 'user' | 'agent' | 'coordination';
          created_at?: string;
        };
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          type: 'rating' | 'suggestion' | 'bug' | 'testimonial';
          rating: number | null;
          title: string;
          content: string;
          agent_id: string | null;
          feature: string | null;
          status: 'pending' | 'reviewed' | 'implemented';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'rating' | 'suggestion' | 'bug' | 'testimonial';
          rating?: number | null;
          title: string;
          content: string;
          agent_id?: string | null;
          feature?: string | null;
          status?: 'pending' | 'reviewed' | 'implemented';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'rating' | 'suggestion' | 'bug' | 'testimonial';
          rating?: number | null;
          title?: string;
          content?: string;
          agent_id?: string | null;
          feature?: string | null;
          status?: 'pending' | 'reviewed' | 'implemented';
          created_at?: string;
        };
      };
      onboarding_steps: {
        Row: {
          id: string;
          user_id: string;
          step_id: number;
          step_title: string;
          step_description: string;
          agent_id: string | null;
          completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          step_id: number;
          step_title: string;
          step_description: string;
          agent_id?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          step_id?: number;
          step_title?: string;
          step_description?: string;
          agent_id?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          total_value: number;
          sol_balance: number;
          tokens: any;
          nfts: any;
          staking_positions: any;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_value?: number;
          sol_balance?: number;
          tokens?: any;
          nfts?: any;
          staking_positions?: any;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_value?: number;
          sol_balance?: number;
          tokens?: any;
          nfts?: any;
          staking_positions?: any;
          updated_at?: string;
        };
      };
      coordination_logs: {
        Row: {
          id: string;
          from_agent: string;
          to_agent: string;
          message_type: string;
          payload: any;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_agent: string;
          to_agent: string;
          message_type: string;
          payload?: any;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_agent?: string;
          to_agent?: string;
          message_type?: string;
          payload?: any;
          user_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}