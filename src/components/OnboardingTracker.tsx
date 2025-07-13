import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, ArrowRight } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { useAgentStore } from '../stores/agentStore';

export const OnboardingTracker: React.FC = () => {
  const { onboardingSteps, completeOnboardingStep, getUserProgress, currentUser } = useUserStore();
  const { agents, setAgentStatus, addMessage } = useAgentStore();
  const progress = getUserProgress();

  const handleStepClick = (stepId: number, agentId?: string) => {
    const step = onboardingSteps.find(s => s.id === stepId);
    if (!step || step.completed) return;

    // Activate the associated agent
    if (agentId) {
      setAgentStatus(agentId, 'active');
      addMessage({
        agentId,
        content: `Starting: ${step.title}`,
        type: 'task'
      });

      // Simulate step completion after a delay
      setTimeout(() => {
        completeOnboardingStep(stepId, agentId);
        setAgentStatus(agentId, 'idle');
        addMessage({
          agentId,
          content: `Completed: ${step.title}`,
          type: 'completion'
        });
      }, 2000);
    }
  };

  const getStepIcon = (step: typeof onboardingSteps[0]) => {
    if (step.completed) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    
    const agent = step.agentId ? agents.find(a => a.id === step.agentId) : null;
    if (agent?.status === 'active' || agent?.status === 'processing') {
      return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
    }
    
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  if (!currentUser) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Your Onboarding Progress</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-purple-400">{Math.round(progress)}%</p>
          <p className="text-xs text-gray-400">Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {onboardingSteps.map((step, index) => {
          const agent = step.agentId ? agents.find(a => a.id === step.agentId) : null;
          const isActive = agent?.status === 'active' || agent?.status === 'processing';
          const canStart = index === 0 || onboardingSteps[index - 1]?.completed;

          return (
            <motion.div
              key={step.id}
              whileHover={canStart && !step.completed ? { scale: 1.02 } : {}}
              className={`flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer ${
                step.completed
                  ? 'bg-green-900/20 border-green-700'
                  : isActive
                  ? 'bg-yellow-900/20 border-yellow-700'
                  : canStart
                  ? 'bg-gray-900 border-gray-600 hover:border-purple-500'
                  : 'bg-gray-900/50 border-gray-700 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => canStart && handleStepClick(step.id, step.agentId)}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-white">{step.title}</h4>
                <p className="text-sm text-gray-400">{step.description}</p>
                {step.completedAt && (
                  <p className="text-xs text-green-400 mt-1">
                    Completed {step.completedAt instanceof Date 
                      ? step.completedAt.toLocaleDateString()
                      : new Date(step.completedAt).toLocaleDateString()
                    }
                  </p>
                )}
              </div>

              {agent && (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{agent.avatar}</span>
                  <span className="text-sm text-gray-400">{agent.name}</span>
                </div>
              )}

              {canStart && !step.completed && (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </motion.div>
          );
        })}
      </div>

      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-500"
        >
          <div className="text-center">
            <h4 className="text-lg font-semibold text-white mb-2">🎉 Onboarding Complete!</h4>
            <p className="text-gray-300 text-sm">
              You're now ready to explore all features of Solana AI Agents. 
              Your agents are standing by to help you succeed in DeFi!
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};