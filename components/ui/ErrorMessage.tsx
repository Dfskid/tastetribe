'use client';

import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Coffee } from 'lucide-react';

const funnyMessages = [
  "Oops! Our taste buds misfired! 😵",
  "Houston, we have a problem... and it's hungry! 🚀",
  "This dish didn't turn out as expected 🍳",
  "The chef is taking a break 👨‍🍳",
  "Looks like the kitchen caught fire 🔥",
  "Our servers are having a food coma 😴",
  "We burned the cookies 🍪",
  "The recipe went missing 📋",
];

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
  variant?: 'default' | 'funny' | 'minimal';
}

export function ErrorMessage({ message, onRetry, variant = 'funny' }: ErrorMessageProps) {
  const displayMessage = variant === 'funny'
    ? funnyMessages[Math.floor(Math.random() * funnyMessages.length)]
    : message || 'Something went wrong';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border-2 border-tomato-200 dark:border-tomato-800"
    >
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2,
        }}
        className="mb-4"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-tomato-400 to-tomato-600 rounded-full flex items-center justify-center shadow-xl">
          <AlertCircle className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {displayMessage}
      </h3>

      {message && variant === 'funny' && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          {message}
        </p>
      )}

      {onRetry && (
        <motion.button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-full font-semibold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </motion.button>
      )}

      <motion.div
        className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Coffee className="w-4 h-4" />
        <span>Meanwhile, grab a snack!</span>
      </motion.div>
    </motion.div>
  );
}

export function EmptyState({
  title,
  description,
  emoji = '🔍',
  action
}: {
  title: string;
  description: string;
  emoji?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="text-8xl mb-4"
      >
        {emoji}
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {title}
      </h3>

      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {description}
      </p>

      {action && (
        <motion.button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-tomato-500 to-tomato-600 text-white rounded-full font-semibold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
