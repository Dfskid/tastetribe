'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  pulse?: boolean;
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
  pulse = false,
}: AnimatedButtonProps) {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-tomato-500 to-tomato-600 text-white hover:from-tomato-600 hover:to-tomato-700',
    secondary: 'bg-gradient-to-r from-lime-500 to-lime-600 text-white hover:from-lime-600 hover:to-lime-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-full font-semibold shadow-lg
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={!disabled ? { scale: 1.05, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)' } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={pulse ? {
        boxShadow: [
          '0 10px 30px rgba(255, 99, 71, 0.3)',
          '0 15px 40px rgba(255, 99, 71, 0.5)',
          '0 10px 30px rgba(255, 99, 71, 0.3)',
        ],
      } : {}}
      transition={pulse ? {
        boxShadow: { duration: 2, repeat: Infinity },
      } : {}}
    >
      {icon && (
        <motion.span
          animate={{ rotate: disabled ? 0 : [0, 360] }}
          transition={{ duration: 0.5 }}
        >
          {icon}
        </motion.span>
      )}
      {children}
    </motion.button>
  );
}

export function IconButton({
  icon,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  tooltip,
}: {
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  tooltip?: string;
}) {
  const variantClasses = {
    primary: 'bg-gradient-to-br from-tomato-400 to-tomato-600 text-white',
    secondary: 'bg-gradient-to-br from-lime-400 to-lime-600 text-white',
    ghost: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        shadow-lg transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      whileHover={!disabled ? { scale: 1.1, rotate: 5 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
    >
      {icon}
    </motion.button>
  );
}
