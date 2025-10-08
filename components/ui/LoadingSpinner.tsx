'use client';

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plate' | 'dots' | 'fork';
}

export function LoadingSpinner({ size = 'md', variant = 'plate' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (variant === 'plate') {
    return (
      <div className="flex items-center justify-center">
        <motion.div
          className={`${sizeClasses[size]} relative`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#FF6347"
              strokeWidth="4"
              strokeDasharray="20 10"
            />
            <circle cx="50" cy="50" r="35" fill="#FFEFD5" />
            <circle cx="50" cy="50" r="25" fill="#FF6347" opacity="0.3" />
          </svg>
        </motion.div>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-tomato-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={sizeClasses[size]}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path
            d="M4 4L20 4M4 12L20 12M4 20L20 20"
            stroke="#FF6347"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}
