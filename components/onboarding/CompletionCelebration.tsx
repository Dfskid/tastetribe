'use client';

import { motion } from 'framer-motion';
import { PartyPopper, Sparkles, Trophy, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CompletionCelebrationProps {
  onContinue: () => void;
  ratingsCount: number;
}

export default function CompletionCelebration({
  onContinue,
  ratingsCount,
}: CompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="fixed inset-0 bg-gradient-to-br from-tomato-50 via-peach-50 to-amber-50 flex items-center justify-center p-4 z-50"
    >
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                scale: 0,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
                scale: [0, 1, 1, 0],
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            >
              {i % 3 === 0 ? (
                <Sparkles className="w-6 h-6 text-amber-400" />
              ) : i % 3 === 1 ? (
                <PartyPopper className="w-6 h-6 text-tomato-400" />
              ) : (
                <Trophy className="w-6 h-6 text-emerald-400" />
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative max-w-md w-full text-center space-y-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow-2xl"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-tomato-600 to-amber-600 bg-clip-text text-transparent">
            You did it!
          </h1>

          <p className="text-lg md:text-xl text-gray-700 font-medium">
            You've rated <span className="font-bold text-tomato-600">{ratingsCount}</span> restaurants
          </p>

          <p className="text-gray-600">
            Your personalized recommendations are ready. Let's find your next favorite spot!
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onContinue}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-tomato-500 to-tomato-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
        >
          Explore Restaurants
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      </div>
    </motion.div>
  );
}
