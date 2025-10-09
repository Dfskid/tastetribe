'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
          return;
        }

        router.push('/social');
        router.refresh();
      }
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 border-2 border-white text-center">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-tomato-400 to-tomato-600 rounded-2xl mb-6 shadow-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <CheckCircle className="h-10 w-10 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-tomato-600 to-tomato-400 bg-clip-text text-transparent mb-4">
            Welcome to TasteTribe!
          </h1>

          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            You&apos;re all set to start discovering amazing restaurants with friends who share your taste.
          </p>

          <div className="bg-peach-50 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Here&apos;s what you can do:
            </h2>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🍽️</span>
                <span className="text-gray-700">Rate restaurants to build your taste profile</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">👥</span>
                <span className="text-gray-700">Connect with friends and see their favorites</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🎯</span>
                <span className="text-gray-700">Get personalized restaurant recommendations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🗺️</span>
                <span className="text-gray-700">Discover hidden gems near you</span>
              </li>
            </ul>
          </div>

          <motion.button
            onClick={handleComplete}
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-tomato-500 to-tomato-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Let&apos;s Go!
                <span className="text-xl">🚀</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
