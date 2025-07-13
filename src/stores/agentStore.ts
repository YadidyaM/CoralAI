import { create } from 'zustand';
import { Agent, AgentMessage, Task, Portfolio } from '../types/agents';
import { PromptAnalysis, AgentActivation } from '../services/agentRouter';

interface AgentCoordination {
  id: string;
  fromAgent: string;
  toAgent: string;
  task: string;
  status: 'pending' | 'acknowledged' | 'completed' | 'failed';
  timestamp: Date;
  result?: any;
}

interface SmartActivation {
  analysis: PromptAnalysis;
  activatedAgents: string[];
  timestamp: Date;
  userPrompt: string;
}

interface AgentStore {
  agents: Agent[];
  messages: AgentMessage[];
  tasks: Task[];
  portfolio: Portfolio | null;
  currentUser: string | null;
  
  // Smart activation features
  currentAnalysis: PromptAnalysis | null;
  activationHistory: SmartActivation[];
  coordinations: AgentCoordination[];
  
  // Agent management
  setAgentStatus: (agentId: string, status: Agent['status']) => void;
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  
  // Smart activation methods
  setCurrentAnalysis: (analysis: PromptAnalysis | null) => void;
  recordActivation: (analysis: PromptAnalysis, activatedAgents: string[], userPrompt: string) => void;
  
  // Agent coordination methods
  initiateCoordination: (fromAgent: string, toAgent: string, task: string) => string;
  updateCoordination: (coordinationId: string, status: AgentCoordination['status'], result?: any) => void;
  getAgentCoordinations: (agentId: string) => AgentCoordination[];
  
  // User management
  setCurrentUser: (publicKey: string) => void;
  updatePortfolio: (portfolio: Portfolio) => void;
  
  // Enhanced agent coordination
  triggerAgentSequence: (sequence: string[]) => void;
  activateAgentsFromAnalysis: (analysis: PromptAnalysis) => Promise<string[]>;
  
  // Analytics and insights
  getAgentPerformance: (agentId: string) => {
    activations: number;
    completions: number;
    successRate: number;
    avgResponseTime: number;
  };
  getMostActiveAgents: () => Array<{ agentId: string; activations: number }>;
  getRecentActivity: () => AgentMessage[];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [
    {
      id: 'onboarding-guide',
      name: 'OnboardingGuide',
      description: 'Helps new users get started with Solana',
      status: 'idle',
      avatar: '🚀',
      specialties: ['User onboarding', 'Wallet setup guidance', 'Education']
    },
    {
      id: 'wallet-wizard',
      name: 'WalletWizard',
      description: 'Manages wallet creation and security',
      status: 'idle',
      avatar: '🔐',
      specialties: ['Wallet creation', 'Security', 'Key management']
    },
    {
      id: 'defi-scout',
      name: 'DeFiScout',
      description: 'Finds best DeFi opportunities',
      status: 'idle',
      avatar: '💰',
      specialties: ['Yield farming', 'DEX trading', 'Risk assessment']
    },
    {
      id: 'nft-creator',
      name: 'NFTCreator',
      description: 'Creates and mints NFTs using AI',
      status: 'idle',
      avatar: '🎨',
      specialties: ['AI art generation', 'NFT minting', 'Metadata creation']
    },
    {
      id: 'staking-agent',
      name: 'StakingAgent',
      description: 'Manages token staking and rewards',
      status: 'idle',
      avatar: '⚡',
      specialties: ['Validator selection', 'Staking optimization', 'Rewards tracking']
    }
  ],
  messages: [],
  tasks: [],
  portfolio: null,
  currentUser: null,
  
  // Smart activation state
  currentAnalysis: null,
  activationHistory: [],
  coordinations: [],

  setAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, status } : agent
      )
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: `msg-${Date.now()}-${Math.random()}`,
          timestamp: new Date()
        }
      ]
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        {
          ...task,
          id: `task-${Date.now()}-${Math.random()}`,
          createdAt: new Date()
        }
      ]
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId 
          ? { ...task, ...updates, ...(updates.status === 'completed' ? { completedAt: new Date() } : {}) }
          : task
      )
    })),

  // Smart activation methods
  setCurrentAnalysis: (analysis) =>
    set({ currentAnalysis: analysis }),

  recordActivation: (analysis, activatedAgents, userPrompt) =>
    set((state) => ({
      activationHistory: [
        ...state.activationHistory,
        {
          analysis,
          activatedAgents,
          userPrompt,
          timestamp: new Date()
        }
      ].slice(-50) // Keep last 50 activations
    })),

  // Agent coordination methods
  initiateCoordination: (fromAgent, toAgent, task) => {
    const coordinationId = `coord-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const coordination: AgentCoordination = {
      id: coordinationId,
      fromAgent,
      toAgent,
      task,
      status: 'pending',
      timestamp: new Date()
    };

    set((state) => ({
      coordinations: [...state.coordinations, coordination]
    }));

    // Add coordination message
    get().addMessage({
      agentId: fromAgent,
      content: `🤝 Coordinating with ${toAgent} for: ${task}`,
      type: 'info'
    });

    return coordinationId;
  },

  updateCoordination: (coordinationId, status, result) =>
    set((state) => ({
      coordinations: state.coordinations.map(coord =>
        coord.id === coordinationId
          ? { ...coord, status, result }
          : coord
      )
    })),

  getAgentCoordinations: (agentId) => {
    const state = get();
    return state.coordinations.filter(
      coord => coord.fromAgent === agentId || coord.toAgent === agentId
    );
  },

  setCurrentUser: (publicKey) =>
    set({ currentUser: publicKey }),

  updatePortfolio: (portfolio) =>
    set({ portfolio }),

  triggerAgentSequence: (sequence) => {
    const { addTask, setAgentStatus } = get();
    
    sequence.forEach((agentId, index) => {
      setAgentStatus(agentId, 'active');
      addTask({
        type: 'sequence',
        description: `Agent ${agentId} activated in sequence`,
        status: 'pending',
        agentId
      });
    });
  },

  activateAgentsFromAnalysis: async (analysis) => {
    const { setAgentStatus, addMessage } = get();
    const activatedAgents: string[] = [];

    // Activate agents based on priority
    for (const activation of analysis.activations) {
      setAgentStatus(activation.agentId, 'active');
      activatedAgents.push(activation.agentId);

      // Add activation message
      addMessage({
        agentId: activation.agentId,
        content: `Activated for: ${analysis.intent} (${Math.round(activation.confidence * 100)}% confidence)`,
        type: 'task'
      });

      // Wait a bit between activations for visual effect
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Record this activation
    get().recordActivation(analysis, activatedAgents, '');

    return activatedAgents;
  },

  // Analytics and insights
  getAgentPerformance: (agentId) => {
    const state = get();
    const agentActivations = state.activationHistory.filter(
      activation => activation.activatedAgents.includes(agentId)
    );
    const agentMessages = state.messages.filter(msg => msg.agentId === agentId);
    const completions = agentMessages.filter(msg => msg.type === 'completion');

    return {
      activations: agentActivations.length,
      completions: completions.length,
      successRate: agentActivations.length > 0 ? (completions.length / agentActivations.length) : 0,
      avgResponseTime: 2000 // This would be calculated from actual timing data
    };
  },

  getMostActiveAgents: () => {
    const state = get();
    const agentCounts = state.agents.reduce((acc, agent) => {
      const activations = state.activationHistory.filter(
        activation => activation.activatedAgents.includes(agent.id)
      ).length;
      acc[agent.id] = activations;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(agentCounts)
      .map(([agentId, activations]) => ({ agentId, activations }))
      .sort((a, b) => b.activations - a.activations);
  },

  getRecentActivity: () => {
    const state = get();
    return state.messages.slice(-20).reverse();
  }
}));