import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, ArrowRight } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { solanaService } from '../services/solanaService';

interface UserRegistrationProps {
  onComplete: () => void;
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    riskTolerance: 'medium' as const,
    investmentGoals: [] as string[],
    notifications: true
  });
  const [loading, setLoading] = useState(false);
  const { registerUser } = useUserStore();

  const investmentGoalOptions = [
    'Passive Income',
    'Long-term Growth',
    'NFT Collection',
    'DeFi Exploration',
    'Learning Crypto'
  ];

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      investmentGoals: prev.investmentGoals.includes(goal)
        ? prev.investmentGoals.filter(g => g !== goal)
        : [...prev.investmentGoals, goal]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create a new wallet for the user
      const wallet = await solanaService.createWallet();
      
      registerUser({
        name: formData.name,
        email: formData.email,
        publicKey: wallet.publicKey,
        onboardingStep: 0,
        onboardingCompleted: false,
        preferences: {
          riskTolerance: formData.riskTolerance,
          investmentGoals: formData.investmentGoals,
          notifications: formData.notifications
        }
      });

      onComplete();
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl p-8 border border-gray-700 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Solana AI Agents</h1>
          <p className="text-gray-400">Let's set up your profile to get started</p>
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Enter your email"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.email}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Risk Tolerance
              </label>
              <div className="space-y-2">
                {(['low', 'medium', 'high'] as const).map((risk) => (
                  <label key={risk} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="riskTolerance"
                      value={risk}
                      checked={formData.riskTolerance === risk}
                      onChange={(e) => setFormData(prev => ({ ...prev, riskTolerance: e.target.value as any }))}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-white capitalize">{risk} Risk</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Investment Goals (Select all that apply)
              </label>
              <div className="space-y-2">
                {investmentGoalOptions.map((goal) => (
                  <label key={goal} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.investmentGoals.includes(goal)}
                      onChange={() => handleGoalToggle(goal)}
                      className="text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className="text-white">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading || formData.investmentGoals.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="mt-8 flex justify-center space-x-2">
          {[1, 2].map((stepNum) => (
            <div
              key={stepNum}
              className={`w-2 h-2 rounded-full transition-colors ${
                step >= stepNum ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};