'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface ProgressTrackerProps {
  current: number;
  total: number;
  showFireworks?: boolean;
}

export default function ProgressTracker({
  current,
  total,
  showFireworks = false,
}: ProgressTrackerProps) {
  const progress = (current / total) * 100;
  const isComplete = current >= total;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <Trophy className="w-5 h-5 text-amber-500" />
              </motion.div>
            )}
            <span className="text-sm md:text-base font-semibold text-gray-700">
              {isComplete ? 'Complete!' : `${current} of ${total} rated`}
            </span>
          </div>

          <span className="text-sm md:text-base font-bold text-tomato-500">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className={`h-full rounded-full ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                : 'bg-gradient-to-r from-tomato-400 to-tomato-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
            }}
          />
        </div>

        {showFireworks && isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-emerald-600 font-medium"
          >
            You did it! Your taste profile is ready.
          </motion.div>
        )}
      </div>
    </div>
  );
}
