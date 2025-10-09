'use client';

import { motion, PanInfo } from 'framer-motion';
import { ReactNode } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeComplete: () => void;
  direction?: 'left' | 'right' | 'none';
}

export default function SwipeableCard({
  children,
  onSwipeComplete,
  direction = 'none',
}: SwipeableCardProps) {
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    if (
      Math.abs(info.offset.x) > swipeThreshold ||
      Math.abs(info.velocity.x) > velocityThreshold
    ) {
      onSwipeComplete();
    }
  };

  const exitAnimation = {
    left: { x: -1000, opacity: 0, rotate: -20 },
    right: { x: 1000, opacity: 0, rotate: 20 },
    none: { scale: 0.8, opacity: 0 },
  };

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
      exit={exitAnimation[direction]}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileDrag={{
        scale: 1.05,
        cursor: 'grabbing',
      }}
    >
      {children}
    </motion.div>
  );
}
