'use client';

import { useState, useEffect } from 'react';
import { getPersonalizedFeed, type FeedActivity } from '@/lib/services/social-feed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Heart, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActivityFeedProps {
  friendsOnly?: boolean;
  limit?: number;
}

export function ActivityFeed({ friendsOnly = false, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsOnly, limit]);

  const loadFeed = async () => {
    setLoading(true);
    const { activities: data, error } = await getPersonalizedFeed({
      limit,
      friendsOnly,
      includeOwnActivity: true,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load activity feed',
        variant: 'destructive',
      });
    } else {
      setActivities(data);
    }

    setLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'rating':
        return <Star className="h-4 w-4 text-amber-500" />;
      case 'favorite':
        return <Heart className="h-4 w-4 text-red-500" />;
      default:
        return <Users className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActivityText = (activity: FeedActivity) => {
    switch (activity.activity_type) {
      case 'rating':
        return (
          <>
            rated{' '}
            <span className="font-medium">{activity.item?.name}</span>
            {activity.rating_value && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {activity.rating_value}/5
              </span>
            )}
          </>
        );
      case 'favorite':
        return (
          <>
            added{' '}
            <span className="font-medium">{activity.item?.name}</span>
            {' '}to favorites
          </>
        );
      case 'friend_joined':
        return 'joined TasteTribe';
      default:
        return 'had an activity';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
        <p className="text-slate-600">
          {friendsOnly
            ? 'Your friends have not rated anything yet'
            : 'Start rating restaurants to see activity here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Card key={activity.id}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={activity.user.avatar_url || ''} />
                <AvatarFallback>
                  {activity.user.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {activity.user.display_name || 'Unknown User'}
                      </span>
                      {' '}
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>
                  {getActivityIcon(activity.activity_type)}
                </div>

                {activity.content && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">
                    {activity.content}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
