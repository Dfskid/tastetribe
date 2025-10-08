'use client';

import { useState, useEffect } from 'react';
import { getPendingRequests, acceptFriendRequest, declineFriendRequest, type FriendRequest } from '@/lib/services/friends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserCheck, UserX, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { requests: data, error } = await getPendingRequests();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load friend requests',
        variant: 'destructive',
      });
    } else {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    const { success, error } = await acceptFriendRequest(requestId);

    if (success) {
      setRequests(requests.filter(r => r.id !== requestId));
      toast({
        title: 'Friend request accepted',
        description: 'You are now friends',
      });
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to accept friend request',
        variant: 'destructive',
      });
    }

    setProcessingId(null);
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    const { success, error } = await declineFriendRequest(requestId);

    if (success) {
      setRequests(requests.filter(r => r.id !== requestId));
      toast({
        title: 'Friend request declined',
      });
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to decline friend request',
        variant: 'destructive',
      });
    }

    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
        <p className="text-slate-600">
          When someone sends you a friend request, it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request.requester.avatar_url || ''} />
                <AvatarFallback>
                  {request.requester.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{request.requester.display_name || 'Unknown User'}</p>
                <p className="text-sm text-slate-500">
                  Sent {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDecline(request.id)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleAccept(request.id)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
