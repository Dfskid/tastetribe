'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export const RATING_TAGS = [
  'Food Quality',
  'Value',
  'Service',
  'Ambiance',
  'Would Return',
];

interface ContextualTagsProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  disabled?: boolean;
}

export default function ContextualTags({
  selectedTags,
  onTagToggle,
  disabled = false,
}: ContextualTagsProps) {
  const isSelected = (tag: string) => selectedTags.includes(tag);

  return (
    <div className="space-y-3">
      <p className="text-center text-sm md:text-base text-gray-600 font-medium">
        What stands out? (optional)
      </p>

      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {RATING_TAGS.map((tag, index) => {
          const selected = isSelected(tag);

          return (
            <motion.button
              key={tag}
              type="button"
              onClick={() => !disabled && onTagToggle(tag)}
              disabled={disabled}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              className={`
                relative
                px-4 py-2.5 md:px-5 md:py-3
                rounded-full
                font-semibold
                text-sm md:text-base
                transition-all
                duration-200
                border-2
                touch-manipulation
                disabled:opacity-50
                disabled:cursor-not-allowed
                ${selected
                  ? 'bg-tomato-500 text-white border-tomato-500 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {selected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </motion.div>
                )}
                {tag}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
