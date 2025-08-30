'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { onAuthChange, sendAuthLink } from '@/lib/auth';
import SchedulingGrid from '@/components/meeting/SchedulingGrid';
import { User } from 'firebase/auth';

export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setAuthLoading(true);
    
    try {
      const result = await sendAuthLink(email);
      
      if (result.success) {
        toast.success('Check your email for the sign-in link!');
        setEmail('');
      } else {
        toast.error(result.error || 'Failed to send sign-in link');
      }
    } catch (error) {
      console.error('Error sending auth link:', error);
      toast.error('Failed to send sign-in link');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Meeting Scheduler</h1>
          {!user && (
            <p className="text-muted-foreground">
              Sign in to manage meetings or participate as a guest
            </p>
          )}
        </div>

        {/* Authentication Section */}
        {!user && (
          <Card className="w-full max-w-md mx-auto mb-8">
            <CardHeader>
              <CardTitle>Sign In (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={authLoading} className="w-full">
                  {authLoading ? 'Sending...' : 'Send Sign-In Link'}
                </Button>
              </form>
              <div className="text-center mt-4 text-sm text-muted-foreground">
                You can also participate without signing in
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meeting Content */}
        <SchedulingGrid 
          meetingId={meetingId} 
          isHost={user ? true : false} // For now, treat any authenticated user as potential host
        />
      </div>
    </div>
  );
}