'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

const LABELS = [
  'Skip',
  'Not for me',
  "It's okay",
  'Good',
  'Really good',
  'Love it!',
];

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export function StarRatingSlider({
  value,
  onChange,
  size = 'lg',
  disabled = false,
  showLabel = true,
  className,
}: StarRatingSliderProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const sizeClass = SIZE_CLASSES[size];

  const handleStarClick = (rating: number) => {
    if (disabled) return;
    onChange(rating);
  };

  const handleMouseEnter = (rating: number) => {
    if (disabled || isDragging) return;
    setHoverValue(rating);
  };

  const handleMouseLeave = () => {
    if (disabled || isDragging) return;
    setHoverValue(null);
  };

  const handleTouchStart = () => {
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setHoverValue(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const starElement = elements.find(el =>
      el.classList.contains('star-rating-button')
    );

    if (starElement) {
      const rating = parseInt(starElement.getAttribute('data-rating') || '0');
      if (rating > 0 && rating <= 5) {
        setHoverValue(rating);
        onChange(rating);
      }
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div
        className="flex items-center gap-2 touch-target"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {[0, 1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            data-rating={rating}
            className={cn(
              'star-rating-button relative transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              sizeClass,
              {
                'scale-110': hoverValue === rating && !disabled,
                'scale-100': hoverValue !== rating || disabled,
              }
            )}
            onClick={() => handleStarClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            type="button"
            aria-label={rating === 0 ? 'Skip rating' : `Rate ${rating} stars`}
          >
            {rating === 0 ? (
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all',
                  displayValue === 0
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-white',
                  sizeClass
                )}
              >
                <span className="text-xs font-medium text-slate-600">Skip</span>
              </div>
            ) : (
              <Star
                className={cn(
                  'transition-all duration-200',
                  {
                    'fill-yellow-400 text-yellow-400': displayValue >= rating,
                    'fill-none text-slate-300': displayValue < rating,
                    'drop-shadow-lg': displayValue >= rating,
                  },
                  sizeClass
                )}
              />
            )}
            {displayValue === rating && !disabled && (
              <span className="absolute -inset-1 rounded-full bg-blue-400 opacity-20 animate-ping" />
            )}
          </button>
        ))}
      </div>

      {showLabel && (
        <div className="text-center min-h-[2rem]">
          <p
            className={cn(
              'text-lg font-medium transition-all duration-200',
              displayValue > 0 ? 'text-slate-900' : 'text-slate-500'
            )}
          >
            {LABELS[displayValue]}
          </p>
        </div>
      )}
    </div>
  );
}
