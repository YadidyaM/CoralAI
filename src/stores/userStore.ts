import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, OnboardingStep, Feedback, Testimonial } from '../types/user';

interface UserStore {
  currentUser: User | null;
  users: User[];
  onboardingSteps: OnboardingStep[];
  feedback: Feedback[];
  testimonials: Testimonial[];
  
  // User management
  registerUser: (userData: Omit<User, 'id' | 'createdAt' | 'stats'>) => void;
  loginUser: (publicKey: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logoutUser: () => void;
  
  // Onboarding
  initializeOnboarding: () => void;
  completeOnboardingStep: (stepId: number, agentId?: string) => void;
  resetOnboarding: () => void;
  
  // Feedback
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'status'>) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  
  // Testimonials
  addTestimonial: (testimonial: Omit<Testimonial, 'id' | 'createdAt'>) => void;
  toggleFeaturedTestimonial: (testimonialId: string) => void;
  
  // Analytics
  updateUserStats: (stats: Partial<User['stats']>) => void;
  getUserProgress: () => number;
}

const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to Solana AI Agents',
    description: 'Learn about our intelligent agent system',
    completed: false,
    agentId: 'onboarding-guide'
  },
  {
    id: 2,
    title: 'Create Your Wallet',
    description: 'Set up a secure Solana wallet',
    completed: false,
    agentId: 'wallet-wizard'
  },
  {
    id: 3,
    title: 'Explore DeFi Opportunities',
    description: 'Discover yield farming and staking options',
    completed: false,
    agentId: 'defi-scout'
  },
  {
    id: 4,
    title: 'Create Your First NFT',
    description: 'Generate and mint an AI-powered NFT',
    completed: false,
    agentId: 'nft-creator'
  },
  {
    id: 5,
    title: 'Start Earning Rewards',
    description: 'Begin staking and earning passive income',
    completed: false,
    agentId: 'staking-agent'
  }
];

// Mock testimonials for testnet
const mockTestimonials: Testimonial[] = [
  {
    id: 'test-1',
    userId: 'user-1',
    userName: 'Sarah Chen',
    userAvatar: '👩‍💻',
    content: 'The AI agents made DeFi so simple! I went from knowing nothing about crypto to earning 8% APY in just 10 minutes.',
    rating: 5,
    feature: 'DeFi Assistant',
    createdAt: new Date('2024-01-15'),
    featured: true
  },
  {
    id: 'test-2',
    userId: 'user-2',
    userName: 'Marcus Johnson',
    userAvatar: '👨‍🎨',
    content: 'Created my first NFT without any technical knowledge. The AI generated amazing artwork and handled all the blockchain stuff.',
    rating: 5,
    feature: 'NFT Creator',
    createdAt: new Date('2024-01-14'),
    featured: true
  },
  {
    id: 'test-3',
    userId: 'user-3',
    userName: 'Emily Rodriguez',
    userAvatar: '👩‍🔬',
    content: 'Love how the agents coordinate with each other. It feels like having a personal crypto advisor team.',
    rating: 4,
    feature: 'Agent Coordination',
    createdAt: new Date('2024-01-13'),
    featured: false
  }
];

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      onboardingSteps: defaultOnboardingSteps,
      feedback: [],
      testimonials: mockTestimonials,

      registerUser: (userData) => {
        const newUser: User = {
          ...userData,
          id: `user-${Date.now()}`,
          createdAt: new Date(),
          stats: {
            totalTransactions: 0,
            totalVolume: 0,
            favoriteAgent: '',
            lastActive: new Date()
          }
        };

        set((state) => ({
          users: [...state.users, newUser],
          currentUser: newUser
        }));

        // Initialize onboarding
        get().initializeOnboarding();
      },

      loginUser: (publicKey) => {
        const user = get().users.find(u => u.publicKey === publicKey);
        if (user) {
          set({ currentUser: { ...user, stats: { ...user.stats, lastActive: new Date() } } });
        }
      },

      updateUser: (updates) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updates };
        set((state) => ({
          currentUser: updatedUser,
          users: state.users.map(u => u.id === currentUser.id ? updatedUser : u)
        }));
      },

      logoutUser: () => {
        set({ currentUser: null });
      },

      initializeOnboarding: () => {
        set({ onboardingSteps: defaultOnboardingSteps.map(step => ({ ...step, completed: false })) });
      },

      completeOnboardingStep: (stepId, agentId) => {
        const now = new Date();
        set((state) => ({
          onboardingSteps: state.onboardingSteps.map(step =>
            step.id === stepId
              ? { ...step, completed: true, completedAt: now }
              : step
          )
        }));

        // Update user onboarding progress
        const { currentUser } = get();
        if (currentUser) {
          const completedSteps = get().onboardingSteps.filter(s => s.completed).length;
          const allCompleted = completedSteps === defaultOnboardingSteps.length;
          
          get().updateUser({
            onboardingStep: Math.max(currentUser.onboardingStep, stepId),
            onboardingCompleted: allCompleted
          });
        }
      },

      resetOnboarding: () => {
        get().initializeOnboarding();
        const { currentUser } = get();
        if (currentUser) {
          get().updateUser({ onboardingStep: 0, onboardingCompleted: false });
        }
      },

      submitFeedback: (feedbackData) => {
        const newFeedback: Feedback = {
          ...feedbackData,
          id: `feedback-${Date.now()}`,
          createdAt: new Date(),
          status: 'pending'
        };

        set((state) => ({
          feedback: [...state.feedback, newFeedback]
        }));

        // If it's a testimonial, also add to testimonials
        if (feedbackData.type === 'testimonial' && feedbackData.rating && feedbackData.rating >= 4) {
          const { currentUser } = get();
          if (currentUser) {
            get().addTestimonial({
              userId: currentUser.id,
              userName: currentUser.name,
              userAvatar: currentUser.avatar,
              content: feedbackData.content,
              rating: feedbackData.rating,
              feature: feedbackData.feature || 'General',
              featured: false
            });
          }
        }
      },

      updateFeedbackStatus: (feedbackId, status) => {
        set((state) => ({
          feedback: state.feedback.map(f =>
            f.id === feedbackId ? { ...f, status } : f
          )
        }));
      },

      addTestimonial: (testimonialData) => {
        const newTestimonial: Testimonial = {
          ...testimonialData,
          id: `testimonial-${Date.now()}`,
          createdAt: new Date()
        };

        set((state) => ({
          testimonials: [...state.testimonials, newTestimonial]
        }));
      },

      toggleFeaturedTestimonial: (testimonialId) => {
        set((state) => ({
          testimonials: state.testimonials.map(t =>
            t.id === testimonialId ? { ...t, featured: !t.featured } : t
          )
        }));
      },

      updateUserStats: (stats) => {
        const { currentUser } = get();
        if (!currentUser) return;

        get().updateUser({
          stats: { ...currentUser.stats, ...stats, lastActive: new Date() }
        });
      },

      getUserProgress: () => {
        const completedSteps = get().onboardingSteps.filter(s => s.completed).length;
        return (completedSteps / defaultOnboardingSteps.length) * 100;
      }
    }),
    {
      name: 'user-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          
          try {
            const data = JSON.parse(str);
            // Convert date strings back to Date objects
            if (data.state) {
              // Convert testimonial dates
              if (data.state.testimonials) {
                data.state.testimonials = data.state.testimonials.map((t: any) => ({
                  ...t,
                  createdAt: new Date(t.createdAt)
                }));
              }
              
              // Convert onboarding step dates
              if (data.state.onboardingSteps) {
                data.state.onboardingSteps = data.state.onboardingSteps.map((s: any) => ({
                  ...s,
                  completedAt: s.completedAt ? new Date(s.completedAt) : undefined
                }));
              }
              
              // Convert user dates
              if (data.state.currentUser) {
                data.state.currentUser = {
                  ...data.state.currentUser,
                  createdAt: new Date(data.state.currentUser.createdAt),
                  stats: {
                    ...data.state.currentUser.stats,
                    lastActive: new Date(data.state.currentUser.stats.lastActive)
                  }
                };
              }
              
              if (data.state.users) {
                data.state.users = data.state.users.map((u: any) => ({
                  ...u,
                  createdAt: new Date(u.createdAt),
                  stats: {
                    ...u.stats,
                    lastActive: new Date(u.stats.lastActive)
                  }
                }));
              }
              
              // Convert feedback dates
              if (data.state.feedback) {
                data.state.feedback = data.state.feedback.map((f: any) => ({
                  ...f,
                  createdAt: new Date(f.createdAt)
                }));
              }
            }
            
            return JSON.stringify(data);
          } catch (error) {
            console.error('Error parsing stored data:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, value);
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        }
      },
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
        onboardingSteps: state.onboardingSteps,
        feedback: state.feedback,
        testimonials: state.testimonials
      })
    }
  )
);