export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  type: 'task' | 'completion' | 'error' | 'info';
  data?: any;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'active' | 'processing' | 'error';
  avatar: string;
  specialties: string[];
}

export interface Task {
  id: string;
  type: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  agentId: string;
  data?: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface Portfolio {
  totalValue: number;
  solBalance: number;
  tokens: TokenHolding[];
  nfts: NFTHolding[];
  staking: StakingPosition[];
}

export interface TokenHolding {
  mint: string;
  symbol: string;
  balance: number;
  value: number;
  apy?: number;
}

export interface NFTHolding {
  mint: string;
  name: string;
  image: string;
  collection?: string;
}

export interface StakingPosition {
  validator: string;
  amount: number;
  rewards: number;
  apy: number;
}