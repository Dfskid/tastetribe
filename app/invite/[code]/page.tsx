'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/services/analytics';
import { Loader2, Users, Sparkles, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, signUp, signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [processing, setProcessing] = useState(false);

  const code = params?.code as string;

  useEffect(() => {
    loadInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (user && invitation) {
      acceptInvitation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invitation]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:profiles!invitations_inviter_id_fkey(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('invitation_code', code)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Invalid invitation',
          description: 'This invitation link is invalid or has expired',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        toast({
          title: 'Invitation expired',
          description: 'This invitation has expired',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }

      setInvitation(data);
      setInviter(data.inviter);
      setLoading(false);
    } catch (error) {
      console.error('Error loading invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitation',
        variant: 'destructive',
      });
      router.push('/');
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation) return;

    try {
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        } as any)
        .eq('id', invitation.id);

      await supabase
        .from('friendships')
        .insert({
          user_id: invitation.inviter_id,
          friend_id: user.id,
          status: 'accepted',
        } as any);

      // Track invitation acceptance
      analytics.trackInviteAccepted(invitation.invitation_code);

      toast({
        title: 'Welcome to TasteTribe!',
        description: `You're now connected with ${inviter?.display_name || 'your friend'}`,
      });

      router.push('/discover');
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    if (isSignUp) {
      if (!displayName) {
        toast({
          title: 'Display name required',
          description: 'Please enter your display name',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
        setProcessing(false);
      } else {
        analytics.trackUserSignup('invitation');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        });
        setProcessing(false);
      } else {
        analytics.trackUserLogin('invitation');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">
            {inviter?.display_name || 'A friend'} invited you!
          </CardTitle>
          <CardDescription>
            Join TasteTribe to discover amazing restaurants together
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-900">Your Benefits</span>
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Personalized restaurant recommendations
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Connect with friends and share experiences
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-pink-500" />
                Unlock rewards by inviting others
              </li>
            </ul>
          </div>

          {!user && (
            <div className="space-y-4">
              <div className="space-y-2">
                {isSignUp && (
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>

              <Button
                onClick={handleAuth}
                disabled={processing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : isSignUp ? (
                  'Create Account & Join'
                ) : (
                  'Sign In & Join'
                )}
              </Button>

              <div className="text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : 'Need an account? Sign up'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
