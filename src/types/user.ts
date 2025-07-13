export interface User {
  id: string;
  publicKey: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  onboardingStep: number;
  onboardingCompleted: boolean;
  preferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    investmentGoals: string[];
    notifications: boolean;
  };
  stats: {
    totalTransactions: number;
    totalVolume: number;
    favoriteAgent: string;
    lastActive: Date;
  };
}

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  agentId?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  type: 'rating' | 'suggestion' | 'bug' | 'testimonial';
  rating?: number;
  title: string;
  content: string;
  agentId?: string;
  feature?: string;
  createdAt: Date;
  status: 'pending' | 'reviewed' | 'implemented';
}

export interface Testimonial {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  rating: number;
  feature: string;
  createdAt: Date;
  featured: boolean;
}