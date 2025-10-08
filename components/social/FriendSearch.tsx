'use client';

import { useState, useCallback } from 'react';
import { searchUsers, sendFriendRequest } from '@/lib/services/friends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserPlus, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function FriendSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const { users, error } = await searchUsers(searchQuery);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } else {
      setResults(users);
    }

    setLoading(false);
  }, [toast]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    handleSearch(value);
  };

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    const { success, error } = await sendFriendRequest(userId);

    if (success) {
      setResults(results.filter(r => r.id !== userId));
      toast({
        title: 'Friend request sent',
        description: 'Your request has been sent',
      });
    } else {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send friend request',
        variant: 'destructive',
      });
    }

    setSendingTo(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="text-center py-8">
          <p className="text-slate-600">No users found</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <Card key={user.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback>
                      {user.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{user.display_name || 'Unknown User'}</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleSendRequest(user.id)}
                  disabled={sendingTo === user.id}
                >
                  {sendingTo === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
