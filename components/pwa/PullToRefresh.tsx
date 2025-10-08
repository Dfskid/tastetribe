'use client';

import { ReactNode } from 'react';
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh';
import { RefreshCw, Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  enabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  threshold = 80,
}: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullDistance, progress, shouldTrigger } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  const showIndicator = isPulling || isRefreshing;

  return (
    <div className="relative">
      <div
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200 ${
          showIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transform: `translateY(${Math.min(pullDistance, 100)}px)`,
        }}
      >
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-full px-6 py-3 shadow-lg flex items-center gap-3">
          {isRefreshing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-tomato-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Refreshing...
              </span>
            </>
          ) : (
            <>
              <RefreshCw
                className={`h-5 w-5 transition-transform text-tomato-600 ${
                  shouldTrigger ? 'rotate-180' : ''
                }`}
                style={{
                  transform: `rotate(${progress * 1.8}deg)`,
                }}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
                </span>
                <div className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-tomato-500 to-orange-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          transform: isRefreshing ? 'translateY(60px)' : 'none',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
