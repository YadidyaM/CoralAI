import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MessageSquare, Bug, Lightbulb, Heart } from 'lucide-react';
import { useUserStore } from '../stores/userStore';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  feature?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  onClose, 
  agentId, 
  feature 
}) => {
  const [feedbackType, setFeedbackType] = useState<'rating' | 'suggestion' | 'bug' | 'testimonial'>('rating');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { submitFeedback, currentUser } = useUserStore();

  const feedbackTypes = [
    { id: 'rating', label: 'Rate Experience', icon: Star, color: 'text-yellow-400' },
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'text-blue-400' },
    { id: 'bug', label: 'Report Bug', icon: Bug, color: 'text-red-400' },
    { id: 'testimonial', label: 'Testimonial', icon: Heart, color: 'text-pink-400' }
  ];

  const handleSubmit = async () => {
    if (!currentUser || !title || !content) return;

    setSubmitting(true);
    try {
      submitFeedback({
        userId: currentUser.id,
        type: feedbackType,
        rating: feedbackType === 'rating' || feedbackType === 'testimonial' ? rating : undefined,
        title,
        content,
        agentId,
        feature
      });

      // Reset form
      setRating(0);
      setTitle('');
      setContent('');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Share Your Feedback</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Feedback Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Feedback Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setFeedbackType(type.id as any)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          feedbackType === type.id
                            ? 'border-purple-500 bg-purple-600/20'
                            : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${type.color}`} />
                        <p className="text-sm text-white">{type.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating (for rating and testimonial types) */}
              {(feedbackType === 'rating' || feedbackType === 'testimonial') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Rating
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder={
                    feedbackType === 'bug' ? 'Brief description of the issue' :
                    feedbackType === 'suggestion' ? 'Your suggestion' :
                    feedbackType === 'testimonial' ? 'What you loved most' :
                    'Your experience summary'
                  }
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Details
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder={
                    feedbackType === 'bug' ? 'Please describe what happened and steps to reproduce...' :
                    feedbackType === 'suggestion' ? 'Tell us about your idea for improvement...' :
                    feedbackType === 'testimonial' ? 'Share your success story with other users...' :
                    'Tell us about your experience...'
                  }
                />
              </div>

              {/* Context Info */}
              {(agentId || feature) && (
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-sm text-gray-400">
                    Feedback for: <span className="text-white">{feature || agentId}</span>
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting || !title || !content || (feedbackType === 'rating' && rating === 0)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};