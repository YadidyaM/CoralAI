import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useUserStore } from '../stores/userStore';

export const TestimonialsSection: React.FC = () => {
  const { testimonials } = useUserStore();
  const featuredTestimonials = testimonials.filter(t => t.featured);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
        }`}
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center space-x-3 mb-6">
        <Quote className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">User Success Stories</h2>
      </div>

      {featuredTestimonials.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No testimonials yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {featuredTestimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 border border-gray-700"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.userAvatar || '👤'}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{testimonial.userName}</h4>
                    <div className="flex items-center space-x-1">
                      {renderStars(testimonial.rating)}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-3 italic">"{testimonial.content}"</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded-full">
                      {testimonial.feature}
                    </span>
                    <span className="text-xs text-gray-400">
                      {testimonial.createdAt instanceof Date 
                        ? testimonial.createdAt.toLocaleDateString()
                        : new Date(testimonial.createdAt).toLocaleDateString()
                      }
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{testimonials.length}</p>
            <p className="text-sm text-gray-400">Total Reviews</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {testimonials.length > 0 
                ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
                : '0.0'
              }
            </p>
            <p className="text-sm text-gray-400">Avg Rating</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {Math.round((testimonials.filter(t => t.rating >= 4).length / Math.max(testimonials.length, 1)) * 100)}%
            </p>
            <p className="text-sm text-gray-400">Satisfied</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};