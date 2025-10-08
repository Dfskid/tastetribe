'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FriendsList } from '@/components/social/FriendsList';
import { FriendRequests } from '@/components/social/FriendRequests';
import { FriendSearch } from '@/components/social/FriendSearch';
import { ActivityFeed } from '@/components/social/ActivityFeed';
import { InviteFriendsModal } from '@/components/viral/InviteFriendsModal';
import { Users, UserPlus, Bell, Activity, Gift } from 'lucide-react';

export default function SocialPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Social</h1>
              <p className="text-slate-600">
                Connect with friends and discover new restaurants together
              </p>
            </div>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Gift className="h-4 w-4" />
              Invite & Earn
            </Button>
          </div>
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
                <ActivityFeed limit={30} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Friends</h2>
              <FriendsList />
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Friend Requests</h2>
              <FriendRequests />
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Find Friends</h2>
              <FriendSearch />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <InviteFriendsModal open={showInviteModal} onOpenChange={setShowInviteModal} />
    </div>
  );
}
