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
          <h1 className="text-4xl font-bold mb-4 text-black">Meeting Scheduler</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered meeting scheduling with Gemini
          </p>
        </div>

        {!showCreateForm ? (
          <Card className="w-full max-w-md mx-auto glass-morphism-card">
            <CardHeader>
              <CardTitle className="text-center">Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                新しい会議を作成
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                または、会議のリンクを共有して参加者と連携してください
              </div>
            </CardContent>
          </Card>
        ) : (
          <CreateMeetingForm onSuccess={handleMeetingCreated} />
        )}

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4 text-black">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-morphism-card">
              <CardHeader>
                <CardTitle className="text-lg">AI-Powered Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gemini AIはすべての参加者のAvailabilityを分析して、最適な会議時間を提案します
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism-card">
              <CardHeader>
                <CardTitle className="text-lg">Google Calendar built-in</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Googleカレンダーから既存の予定をインポートして、利用不可な時間を自動的にブロックします
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass-morphism-card">
              <CardHeader>
                <CardTitle className="text-lg">Easy Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  会議のリンクを共有するだけ。<br />簡単に参加者を会議調整へ招待できます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
