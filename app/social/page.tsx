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
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-peach-100 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-tomato-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                <span className="text-3xl">👥</span> Social
              </h1>
              <p className="text-gray-700 dark:text-slate-400 font-medium">
                Connect with friends and discover new restaurants together
              </p>
            </div>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-xl hover:scale-105 transition-all rounded-full px-6 py-3 font-semibold shadow-lg"
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
