'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface TouchStarRatingProps {
  value?: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

export default function TouchStarRating({
  value = 0,
  onChange,
  size = 'lg',
  disabled = false,
}: TouchStarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const displayRating = hoveredStar !== null ? hoveredStar : value;

  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        const isHovered = hoveredStar === star;

        return (
          <motion.button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => !disabled && setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
            disabled={disabled}
            className={`
              ${sizeClasses[size]}
              relative
              rounded-full
              transition-all
              duration-200
              disabled:opacity-50
              disabled:cursor-not-allowed
              touch-manipulation
              active:scale-90
            `}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
            initial={false}
            animate={{
              scale: isHovered ? 1.15 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={false}
              animate={{
                rotate: isFilled ? [0, -10, 10, -10, 0] : 0,
              }}
              transition={{
                duration: 0.5,
                ease: 'easeInOut',
              }}
            >
              <Star
                className={`
                  w-full h-full
                  transition-colors
                  duration-200
                  ${isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-gray-300'
                  }
                  ${isHovered && !isFilled ? 'text-amber-300' : ''}
                `}
                strokeWidth={2}
              />
            </motion.div>

            {isFilled && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-full h-full rounded-full bg-amber-400/20" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
