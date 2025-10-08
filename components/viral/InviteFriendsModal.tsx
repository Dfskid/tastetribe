'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { createInvitation, type Invitation } from '@/lib/services/friends';
import {
  getInvitationProgress,
  generateShareableInviteLink,
  generateShareText,
  trackViralMetric,
} from '@/lib/services/viral-growth';
import { analytics } from '@/lib/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  MessageSquare,
  Share2,
  Copy,
  Gift,
  Users,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';

interface InviteFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteFriendsModal({ open, onOpenChange }: InviteFriendsModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState({
    acceptedCount: 0,
    nextMilestone: null as { target: number; reward: string } | null,
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    if (open) {
      loadProgress();
    }
  }, [open]);

  const loadProgress = async () => {
    const { acceptedCount, nextMilestone } = await getInvitationProgress();
    setProgress({ acceptedCount, nextMilestone });
  };

  const handleSendInvite = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { invitation: newInvitation, error } = await createInvitation(email, undefined, 'email');
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (newInvitation) {
      setInvitation(newInvitation);
      setEmail('');
      await trackViralMetric('invitation_sent', { method: 'email', invitee: email });
      analytics.trackInviteSent('email', 1);
      toast({
        title: 'Invitation sent!',
        description: 'Your friend will receive an email invitation',
      });
    }
  };

  const handleCopyLink = async () => {
    if (!invitation) {
      const { invitation: newInvitation, error } = await createInvitation(
        undefined,
        undefined,
        'link'
      );
      if (error || !newInvitation) {
        toast({
          title: 'Error',
          description: 'Failed to generate invite link',
          variant: 'destructive',
        });
        return;
      }
      setInvitation(newInvitation);
    }

    const link = generateShareableInviteLink(invitation?.invitation_code || '');
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await trackViralMetric('invitation_sent', { method: 'link_copy' });
    analytics.trackInviteSent('link_copy', 1);

    toast({
      title: 'Link copied!',
      description: 'Share this link with your friends',
    });
  };

  const handleShareSocial = async (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    if (!invitation) {
      const { invitation: newInvitation, error } = await createInvitation(
        undefined,
        undefined,
        'link'
      );
      if (error || !newInvitation) {
        toast({
          title: 'Error',
          description: 'Failed to generate invite link',
          variant: 'destructive',
        });
        return;
      }
      setInvitation(newInvitation);
    }

    const link = generateShareableInviteLink(invitation?.invitation_code || '');
    const { socialText } = generateShareText(profile?.display_name || 'A friend', invitation?.invitation_code || '');

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialText)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(socialText)}`;
        break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
    await trackViralMetric('share_completed', { platform });
    analytics.trackInviteSent(platform, 1);
  };

  const progressPercentage = progress.nextMilestone
    ? (progress.acceptedCount / progress.nextMilestone.target) * 100
    : 100;

  const milestones = [
    { count: 3, reward: 'Advanced taste matching', icon: Sparkles },
    { count: 5, reward: 'Enhanced recommendations', icon: Gift },
    { count: 10, reward: 'Premium trial access', icon: Users },
  ];

  const completedMilestones = milestones.filter((m) => progress.acceptedCount >= m.count);
  const nextMilestoneData = milestones.find((m) => progress.acceptedCount < m.count);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-blue-500" />
            Invite Friends & Unlock Rewards
          </DialogTitle>
          <DialogDescription>
            Get better recommendations by inviting friends who share your taste
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Your Progress</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {progress.acceptedCount}
              </span>
            </div>

            {nextMilestoneData && (
              <>
                <Progress value={progressPercentage} className="h-2 mb-2" />
                <p className="text-sm text-slate-600">
                  {nextMilestoneData.count - progress.acceptedCount} more friend
                  {nextMilestoneData.count - progress.acceptedCount !== 1 ? 's' : ''} to unlock:{' '}
                  <span className="font-semibold text-blue-600">
                    {nextMilestoneData.reward}
                  </span>
                </p>
              </>
            )}

            {!nextMilestoneData && progress.acceptedCount >= 10 && (
              <p className="text-sm text-green-600 font-semibold">
                All milestones unlocked! Keep inviting to help friends discover great places.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-slate-700">Rewards</h4>
            <div className="space-y-2">
              {milestones.map((milestone) => {
                const isCompleted = progress.acceptedCount >= milestone.count;
                const Icon = milestone.icon;
                return (
                  <div
                    key={milestone.count}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCompleted
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-100' : 'bg-slate-100'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Icon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">
                        {milestone.count} friends
                      </p>
                      <p
                        className={`text-xs ${
                          isCompleted ? 'text-green-600' : 'text-slate-600'
                        }`}
                      >
                        {milestone.reward}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-700">Send Invitation</h4>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              />
              <Button onClick={handleSendInvite} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-slate-700">Or share via</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyLink} className="gap-2">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShareSocial('whatsapp')}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShareSocial('twitter')}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShareSocial('facebook')}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
