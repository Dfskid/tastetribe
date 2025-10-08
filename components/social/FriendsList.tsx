'use client';

import { useState, useEffect } from 'react';
import { getFriends, removeFriend, type Friend } from '@/lib/services/friends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserMinus, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    const { friends: data, error } = await getFriends();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load friends',
        variant: 'destructive',
      });
    } else {
      setFriends(data);
    }
    setLoading(false);
  };

  const handleRemoveFriend = async (friendId: string) => {
    setRemovingId(friendId);
    const { success, error } = await removeFriend(friendId);

    if (success) {
      setFriends(friends.filter(f => f.friend_id !== friendId));
      toast({
        title: 'Friend removed',
        description: 'You are no longer friends with this user',
      });
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to remove friend',
        variant: 'destructive',
      });
    }

    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
        <p className="text-slate-600 mb-4">
          Start building your network to get better recommendations!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <Card key={friend.friend_id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={friend.avatar_url || ''} />
                <AvatarFallback>
                  {friend.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{friend.display_name || 'Unknown User'}</p>
                <p className="text-sm text-slate-500">
                  Friends since {new Date(friend.friendship_since).toLocaleDateString()}
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removingId === friend.friend_id}
                >
                  {removingId === friend.friend_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove friend?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove {friend.display_name} from your friends?
                    You can always send another friend request later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleRemoveFriend(friend.friend_id)}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  );
}
