'use client';

import { Card, CardContent, CardHeader } from './card';

export function RestaurantCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
        <div className="flex gap-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
      </CardContent>
    </Card>
  );
}

export function RestaurantGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MovieCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
        <div className="flex flex-wrap gap-1">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TextLineSkeleton({ width = 'full' }: { width?: 'full' | '3/4' | '1/2' | '1/3' | '1/4' }) {
  const widthClass = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  }[width];

  return <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${widthClass} animate-pulse`} />;
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-peach-100 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-8 space-y-3 animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <RestaurantGridSkeleton />
      </div>
    </div>
  );
}
