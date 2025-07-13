import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useSupabaseUserStore } from '../stores/supabaseUserStore';
import { solanaService } from '../services/solanaService';

interface SupabaseUserRegistrationProps {
  onComplete: () => void;
}

export const SupabaseUserRegistration: React.FC<SupabaseUserRegistrationProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    riskTolerance: 'medium' as const,
    investmentGoals: [] as string[],
    notifications: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signUp, signIn, loading: storeLoading, error: storeError } = useSupabaseUserStore();

  const investmentGoalOptions = [
    'Passive Income',
    'Long-term Growth',
    'NFT Collection',
    'DeFi Exploration',
    'Learning Crypto'
  ];

  // Clear errors when switching modes
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [mode]);

  // Watch for store errors
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      investmentGoals: prev.investmentGoals.includes(goal)
        ? prev.investmentGoals.filter(g => g !== goal)
        : [...prev.investmentGoals, goal]
    }));
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    
    try {
      await signIn(formData.email, formData.password);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => onComplete(), 1000);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account first.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    if (formData.investmentGoals.length === 0) {
      setError('Please select at least one investment goal');
      return;
    }

    setLoading(true);

    try {
      // Create wallet first
      const wallet = await solanaService.createWallet();
      
      await signUp(formData.email, formData.password, {
        name: formData.name,
        wallet_address: wallet.publicKey,
        risk_tolerance: formData.riskTolerance,
        investment_goals: formData.investmentGoals,
        notifications: formData.notifications
      });

      setSuccess('Account created successfully! Please check your email to confirm your account.');
      
      // Auto-switch to login after successful registration
      setTimeout(() => {
        setMode('login');
        setStep(1);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }, 2000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message?.includes('User already registered') || error.message?.includes('user_already_exists')) {
        setError('This email is already registered. Please sign in instead.');
        setTimeout(() => setMode('login'), 2000);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      riskTolerance: 'medium',
      investmentGoals: [],
      notifications: true
    });
    setStep(1);
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl p-8 border border-gray-700 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome Back' : 
             mode === 'register' ? 'Join Solana AI Agents' : 
             'Reset Password'}
          </h1>
          <p className="text-gray-400">
            {mode === 'login' ? 'Sign in to your account' : 
             mode === 'register' ? 'Create your account to get started' : 
             'Enter your email to reset your password'}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded-lg flex items-center space-x-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-green-600/20 border border-green-600 rounded-lg flex items-center space-x-2"
          >
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
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
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-12"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              onClick={handleLogin}
              disabled={loading || storeLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading || storeLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>

            <div className="text-center space-y-2">
              <button
                onClick={() => switchMode('register')}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                disabled={loading}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </motion.div>
        )}

        {/* Register Form - Step 1 */}
        {mode === 'register' && step === 1 && (
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-12"
                  placeholder="Enter your password (min 6 characters)"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <div className="text-center">
              <button
                onClick={() => switchMode('login')}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                disabled={loading}
              >
                Already have an account? Sign in
              </button>
            </div>
          </motion.div>
        )}

        {/* Register Form - Step 2 */}
        {mode === 'register' && step === 2 && (
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
                      disabled={loading}
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
                      disabled={loading}
                    />
                    <span className="text-white">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={() => setStep(1)}
                disabled={loading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                onClick={handleRegister}
                disabled={loading || storeLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading || storeLoading ? (
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

        {/* Progress Indicators for Registration */}
        {mode === 'register' && (
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
        )}
      </motion.div>
    </div>
  );
};