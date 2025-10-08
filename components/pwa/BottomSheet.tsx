'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.9, 0.5],
  initialSnap = 0,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(snapPoints[initialSnap]);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      onClose();
      return;
    }

    let closestSnap = snapPoints[0];
    let minDistance = Math.abs((window.innerHeight * snapPoints[0]) - (window.innerHeight * currentSnap - offset));

    snapPoints.forEach((snap) => {
      const distance = Math.abs((window.innerHeight * snap) - (window.innerHeight * currentSnap - offset));
      if (distance < minDistance) {
        minDistance = distance;
        closestSnap = snap;
      }
    });

    setCurrentSnap(closestSnap);

    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: `${(1 - currentSnap) * 100}%` }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl"
            style={{
              height: `${currentSnap * 100}vh`,
              maxHeight: '95vh',
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex flex-col items-center pt-3 pb-4 px-4 border-b border-gray-200 dark:border-gray-700">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mb-4" />

                {title && (
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
