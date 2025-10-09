'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';

interface EnhancedStarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'md' | 'lg';
  disabled?: boolean;
  showLabels?: boolean;
}

const ratingLabels = ['Terrible', 'Poor', 'Okay', 'Good', 'Amazing!'];

export default function EnhancedStarRating({
  value,
  onChange,
  size = 'lg',
  disabled = false,
  showLabels = true,
}: EnhancedStarRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const sizeClasses = {
    md: 'w-12 h-12',
    lg: 'w-16 h-16 md:w-20 md:h-20',
  };

  const displayRating = hoveredStar !== null ? hoveredStar : value;
  const labelText = displayRating > 0 ? ratingLabels[displayRating - 1] : 'Tap to rate';

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 md:gap-3">
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
                flex items-center justify-center
                ${!disabled && 'active:scale-90'}
              `}
              whileHover={!disabled ? { scale: 1.15, rotate: [0, -5, 5, 0] } : {}}
              whileTap={!disabled ? { scale: 0.9 } : {}}
              initial={false}
            >
              <Star
                className={`
                  w-full h-full
                  transition-all
                  duration-200
                  ${isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-lg'
                    : 'fill-none text-gray-300'
                  }
                  ${isHovered && !isFilled ? 'text-amber-300 scale-110' : ''}
                `}
                strokeWidth={2.5}
              />

              {isFilled && star === displayRating && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <Sparkles className="w-8 h-8 text-amber-300" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {showLabels && (
        <AnimatePresence mode="wait">
          <motion.div
            key={labelText}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`
              text-center font-bold text-lg md:text-xl
              ${displayRating === 0 ? 'text-gray-500' : ''}
              ${displayRating === 1 ? 'text-red-500' : ''}
              ${displayRating === 2 ? 'text-orange-500' : ''}
              ${displayRating === 3 ? 'text-yellow-500' : ''}
              ${displayRating === 4 ? 'text-lime-500' : ''}
              ${displayRating === 5 ? 'text-emerald-500' : ''}
            `}
          >
            {labelText}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
