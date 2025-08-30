'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateMeetingForm from '@/components/meeting/CreateMeetingForm';

export default function Home() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const router = useRouter();

  const handleMeetingCreated = (meetingId: string) => {
    router.push(`/meeting/${meetingId}`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Meeting Scheduler</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered meeting scheduling with Gemini and Firebase
          </p>
        </div>

        {!showCreateForm ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                Create New Meeting
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                or share a meeting link with participants
              </div>
            </CardContent>
          </Card>
        ) : (
          <CreateMeetingForm onSuccess={handleMeetingCreated} />
        )}

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI-Powered Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gemini AI analyzes all participants&apos; availability to suggest the best meeting times
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Google Calendar Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Import your existing schedule to automatically block unavailable times
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Easy Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share meeting links with participants - no account required to participate
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
