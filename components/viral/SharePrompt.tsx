'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Share2, Sparkles, Users, TrendingUp } from 'lucide-react';
import {
  trackSharePrompt,
  updateSharePromptAction,
  type SharePromptType,
} from '@/lib/services/viral-growth';
import { InviteFriendsModal } from './InviteFriendsModal';

interface SharePromptProps {
  promptType: SharePromptType;
  context?: Record<string, any>;
  trigger?: 'after_rating' | 'discover_moment' | 'achievement_unlock' | 'milestone_reached';
  onDismiss?: () => void;
}

const promptConfig = {
  after_rating: {
    icon: Sparkles,
    title: 'Great taste!',
    message: 'Invite friends with similar taste to get even better recommendations',
    cta: 'Invite Friends',
  },
  discover_moment: {
    icon: TrendingUp,
    title: 'Found something great?',
    message: 'Share TasteTribe with friends who would love to discover this too',
    cta: 'Share Now',
  },
  achievement_unlock: {
    icon: Sparkles,
    title: 'Achievement Unlocked!',
    message: 'Help your friends unlock rewards by inviting them to join',
    cta: 'Invite & Earn',
  },
  milestone_reached: {
    icon: Users,
    title: 'Milestone Reached!',
    message: 'Celebrate by inviting friends to discover great places together',
    cta: 'Invite Friends',
  },
  onboarding_complete: {
    icon: Sparkles,
    title: 'You\'re all set!',
    message: 'Get better recommendations by adding friends who share your taste',
    cta: 'Add Friends',
  },
};

export function SharePrompt({ promptType, context, onDismiss }: SharePromptProps) {
  const [visible, setVisible] = useState(true);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const config = promptConfig[promptType];
  const Icon = config.icon;

  useEffect(() => {
    const track = async () => {
      const { promptId: id } = await trackSharePrompt(promptType, context);
      setPromptId(id);
    };
    track();
  }, [promptType, context]);

  const handleDismiss = async () => {
    setVisible(false);
    if (promptId) {
      await updateSharePromptAction(promptId, 'dismissed');
    }
    onDismiss?.();
  };

  const handleShare = async () => {
    setShowInviteModal(true);
    if (promptId) {
      await updateSharePromptAction(promptId, 'shared', 'invite_modal');
    }
  };

  if (!visible) return null;

  return (
    <>
      <Card className="relative border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-slate-600" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-slate-900">{config.title}</h3>
            <p className="text-sm text-slate-600">{config.message}</p>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleShare}
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="h-4 w-4" />
                {config.cta}
              </Button>
              <Button onClick={handleDismiss} variant="ghost" size="sm">
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <InviteFriendsModal open={showInviteModal} onOpenChange={setShowInviteModal} />
    </>
  );
}
