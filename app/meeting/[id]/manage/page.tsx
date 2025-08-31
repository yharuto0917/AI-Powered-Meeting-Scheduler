'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { doc, getDoc, collection, getDocs, updateDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import * as firebaseClient from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { Clock, Users, Brain, CheckCircle, Calendar } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Meeting {
  id: string;
  title: string;
  description: string;
  timeSlots: any[];
  deadline: any;
  creatorUid: string;
  status: string;
  confirmedDateTime: string | null;
  confirmedReason: string | null;
  createdAt: any;
}

interface Participant {
  id: string;
  email: string;
  schedule: Record<string, { status: 'available' | 'maybe' | 'unavailable'; timestamp: any }>;
}

interface TimeSlotAnalysis {
  timeSlotKey: string;
  dateTime: string;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  totalParticipants: number;
  score: number;
}

export default function ManageMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [analysis, setAnalysis] = useState<TimeSlotAnalysis[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    console.log('Current user:', currentUser);
    setUser(currentUser);
    
    if (!currentUser) {
      console.warn('現在のユーザーが見つかりません');
      toast.error('会議を管理するにはサインインしてください');
      router.push(`/meeting/${meetingId}`);
      return;
    }
    
    console.log('Starting to load meeting data...');
    loadMeetingData();
  }, [meetingId, router]);

  const loadMeetingData = async () => {
    console.log('Loading meeting data for ID:', meetingId);
    console.log('Firebase client:', firebaseClient);
    console.log('Firebase db instance:', firebaseClient.db);
    
    try {
      const dbInstance = (firebaseClient.db as unknown as Firestore | null);
      console.log('Database instance:', dbInstance);
      
      if (!dbInstance) {
        console.error('Firebase database instance is null');
        toast.error('Firebaseが設定されていません。環境変数を設定してください。');
        router.push('/');
        return;
      }
      // Load meeting data
      const meetingDoc = await getDoc(doc(dbInstance, 'meetings', meetingId));
      if (!meetingDoc.exists()) {
        toast.error('会議が見つかりません');
        router.push('/');
        return;
      }

      const raw = meetingDoc.data() as any;
      const toDateSafe = (value: any): string | null => {
        if (!value) return null;
        try {
          if (typeof value.toDate === 'function') return value.toDate().toISOString();
          if (value instanceof Date) return value.toISOString();
          if (typeof value === 'string') {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d.toISOString();
          }
        } catch (_) {}
        return null;
      };

      const meetingData = {
        id: meetingDoc.id,
        ...raw,
        confirmedDateTime: toDateSafe(raw.confirmedDateTime),
        deadline: raw.deadline,
      } as unknown as Meeting;
      setMeeting(meetingData);

      // Check if user is the creator
      if (user && meetingData.creatorUid !== user.uid) {
        toast.error('この会議を管理する権限がありません');
        router.push(`/meeting/${meetingId}`);
        return;
      }

      // Load participants data
      const participantsSnapshot = await getDocs(collection(dbInstance, 'meetings', meetingId, 'availabilities'));
      const participantsData: Participant[] = [];
      
      participantsSnapshot.forEach((doc) => {
        participantsData.push({
          id: doc.id,
          email: doc.data().email || doc.id,
          schedule: doc.data().schedule || {}
        });
      });

      setParticipants(participantsData);

      // Analyze time slots
      const timeSlotAnalysis = analyzeTimeSlots(meetingData.timeSlots, participantsData);
      setAnalysis(timeSlotAnalysis);

    } catch (error: any) {
      console.error('会議データを読み込めませんでした:', error);
      console.error('エラー詳細:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      });
      
      // Provide specific error messages
      let errorMessage = '会議データを読み込めませんでした';
      if (error.code === 'permission-denied') {
        errorMessage = 'パーミッションが拒否されました。認証を確認してください。';
      } else if (error.code === 'unavailable') {
        errorMessage = 'サービスが利用できません。Firebase emulatorsが実行されているか確認してください。';
      } else if (error.message?.includes('Firebase is not configured')) {
        errorMessage = 'Firebaseの設定にエラーがあります。環境変数を確認してください。';
      } else if (error.message) {
        errorMessage = `会議データを読み込めませんでした: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTimeSlots = (timeSlots: any[], participants: Participant[]): TimeSlotAnalysis[] => {
    console.log('Analyzing time slots:', { timeSlots, participants });
    const analysis: TimeSlotAnalysis[] = [];

    timeSlots.forEach((slot) => {
      console.log('Processing slot:', slot);
      // Normalize slot to ISO string for consistent keying
      let timeSlotKey: string;
      try {
        if (slot && typeof slot.toDate === 'function') {
          timeSlotKey = slot.toDate().toISOString();
        } else if (slot instanceof Date) {
          timeSlotKey = slot.toISOString();
        } else if (typeof slot === 'string') {
          timeSlotKey = new Date(slot).toISOString();
        } else if (slot && typeof slot === 'object' && 'key' in slot && typeof (slot as any).key === 'string') {
          timeSlotKey = new Date((slot as any).key).toISOString();
        } else {
          // Fallback to current time ISO to avoid runtime error, though this should not happen
          console.warn('Unexpected slot format; generating fallback key', slot);
          timeSlotKey = new Date().toISOString();
        }
      } catch (e) {
        console.error('Failed to normalize time slot key', slot, e);
        timeSlotKey = new Date().toISOString();
      }
      let availableCount = 0;
      let maybeCount = 0;
      let unavailableCount = 0;

      participants.forEach((participant) => {
        const availability = participant.schedule[timeSlotKey];
        if (availability) {
          switch (availability.status) {
            case 'available':
              availableCount++;
              break;
            case 'maybe':
              maybeCount++;
              break;
            case 'unavailable':
              unavailableCount++;
              break;
          }
        }
      });

      const totalParticipants = participants.length;
      // Score calculation: prioritize available, consider maybe as half weight
      const score = (availableCount * 2 + maybeCount * 1) / (totalParticipants * 2) * 100;

      // dateTime will use the normalized key (ISO format)
      const dateTime = timeSlotKey;
      
      console.log('Processed slot - timeSlotKey:', timeSlotKey, 'dateTime:', dateTime);
      
      analysis.push({
        timeSlotKey,
        dateTime,
        availableCount,
        maybeCount,
        unavailableCount,
        totalParticipants,
        score
      });
    });

    // Sort by score (highest first)
    return analysis.sort((a, b) => b.score - a.score);
  };

  const runAISuggestion = async () => {
    setAiLoading(true);
    
    try {
      // Find the best time slot based on analysis
      if (analysis.length === 0) {
        toast.error('AI分析に利用可能なデータがありません。参加者が回答しているか確認してください。');
        console.error('分析配列が空です');
        return;
      }
      
      if (participants.length === 0) {
        toast.error('参加者が回答していません。会議のリンクを共有して参加者と連携してください。');
        return;
      }

      const bestSlot = analysis[0];
      
      // Validate bestSlot data
      console.log('最適な時間スロットが選択されました:', bestSlot);
      console.log('分析データ:', analysis);
      
      if (!bestSlot) {
        toast.error('AI分析に利用可能な時間スロットがありません');
        console.error('bestSlotがnull/undefinedです');
        return;
      }
      
      if (!bestSlot.dateTime) {
        toast.error('無効な時間スロットデータ - dateTimeがありません');
        console.error('bestSlot.dateTimeがありません:', bestSlot);
        return;
      }

      const reason = generateAIReason(bestSlot, analysis);

      console.log('会議を更新しています:', {
        status: 'confirmed',
        confirmedDateTime: bestSlot.dateTime,
        confirmedReason: reason
      });

      // Update meeting with AI decision
      const dbInstance = (firebaseClient.db as unknown as Firestore | null);
      if (!dbInstance) {
        toast.error('Firebaseが設定されていません。環境変数を設定してください。');
        return;
      }
      await updateDoc(doc(dbInstance, 'meetings', meetingId), {
        status: 'confirmed',
        confirmedDateTime: bestSlot.dateTime,
        confirmedReason: reason,
        updatedAt: serverTimestamp()
      });

      toast.success('AIが最適な会議時間を選択しました！');
      await loadMeetingData(); // Reload data

    } catch (error) {
      console.error('AI分析を実行できませんでした:', error);
      toast.error('AI分析を実行できませんでした');
    } finally {
      setAiLoading(false);
    }
  };

  const generateAIReason = (bestSlot: TimeSlotAnalysis, allSlots: TimeSlotAnalysis[]): string => {
    const { availableCount, maybeCount, totalParticipants, score } = bestSlot;
    
    let reason = `AI Analysis: この時間スロットは最高の互換性スコア (${score.toFixed(1)}%) を持っています。`;
    
    if (availableCount === totalParticipants) {
      reason += `すべての${totalParticipants}人の参加者がこの時間を利用可能と回答しました。`;
    } else if (availableCount > totalParticipants / 2) {
      reason += `${availableCount}人の${totalParticipants}人の参加者が利用可能と回答しました。`;
      if (maybeCount > 0) {
        reason += `${maybeCount}人がわからないと回答しました。`;
      }
    } else {
      reason += `一方で、${availableCount}人の${totalParticipants}人の参加者が利用可能と回答しました。`;
      if (maybeCount > 0) {
        reason += `${maybeCount}人がわからないと回答しました。`;
      }
      reason += `すべてのオプションの中で最適な妥協点となりました。`;
    }

    const alternativeSlots = allSlots.slice(1, 3).filter(slot => slot.score > 20);
    if (alternativeSlots.length > 0) {
      const alternativeTimes = alternativeSlots.map(s => new Date(s.dateTime).toLocaleString());
      reason += `考慮された代替時間は${alternativeTimes.join(' and ')}です。`;
    }

    return reason;
  };

  const manuallySelectTime = async (timeSlotAnalysis: TimeSlotAnalysis) => {
    try {
      // Validate time slot data
      if (!timeSlotAnalysis || !timeSlotAnalysis.dateTime) {
        toast.error('無効な時間スロットデータ');
        console.error('無効な時間スロットデータ:', timeSlotAnalysis);
        return;
      }

      const reason = `手動で選択されました。${timeSlotAnalysis.availableCount}人が利用可能、${timeSlotAnalysis.maybeCount}人がわからない。`;

      console.log('Manually updating meeting with:', {
        status: 'confirmed',
        confirmedDateTime: timeSlotAnalysis.dateTime,
        confirmedReason: reason
      });

      const dbInstance = (firebaseClient.db as unknown as Firestore | null);
      if (!dbInstance) {
        toast.error('Firebaseが設定されていません。環境変数を設定してください。');
        return;
      }
      await updateDoc(doc(dbInstance, 'meetings', meetingId), {
        status: 'confirmed',
        confirmedDateTime: timeSlotAnalysis.dateTime,
        confirmedReason: reason,
        updatedAt: serverTimestamp()
      });

      toast.success('会議の時間を確定しました');
      await loadMeetingData();
    } catch (error) {
      console.error('Error confirming time:', error);
      toast.error('会議の時間を確定できませんでした');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>会議管理を読み込んでいます...</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>会議が見つかりません</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">{meeting.title}</h1>
            <p className="text-muted-foreground">会議を管理</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/meeting/${meetingId}`)}
          >
            ← 会議に戻る
          </Button>
        </div>

        {/* Meeting Status */}
        <Card className="glass-morphism-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              会議のステータス
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meeting.status === 'confirmed' && meeting.confirmedDateTime ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">会議が確定しました</span>
                </div>
                <p><strong>日時:</strong> {new Date(meeting.confirmedDateTime).toLocaleString()}</p>
                <p><strong>理由:</strong> {meeting.confirmedReason}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <span>未決定</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Summary */}
        <Card className="glass-morphism-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {participants.map((participant, index) => (
                <div key={`participant-${participant.id}-${index}`} className="p-3 bg-background/50 rounded-lg">
                  <p className="text-sm font-medium">
                    {participant.email.includes('@') ? participant.email.split('@')[0] : `Participant ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(participant.schedule).length} 回答
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis and Decision */}
        {meeting.status !== 'confirmed' && (
          <Card className="glass-morphism-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Decision Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AIはすべての参加者のAvailabilityを分析して、最適な会議時間を自動的に選択します。
              </p>
              <Button
                onClick={runAISuggestion}
                disabled={aiLoading || participants.length === 0}
                className="glass-morphism-button"
              >
                {aiLoading ? 'AI Analyzing...' : 'Run AI Analysis & Decision'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Time Slot Analysis */}
        <Card className="glass-morphism-card">
          <CardHeader>
            <CardTitle>Time Slot Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.map((slot, index) => (
                <div
                  key={`timeslot-analysis-${index}-${slot.timeSlotKey}`}
                  className={`p-4 rounded-lg border ${
                    index === 0 && meeting.status !== 'confirmed' 
                      ? 'border-green-300 bg-green-50/50' 
                      : 'border-gray-200 bg-background/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {new Date(slot.dateTime).toLocaleString()}
                        {index === 0 && meeting.status !== 'confirmed' && (
                          <span className="ml-2 text-sm text-green-600 font-semibold">
                            🏆 最適なオプション
                          </span>
                        )}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span className="text-green-600">✓ {slot.availableCount} 利用可能</span>
                        <span className="text-amber-600">? {slot.maybeCount} わからない</span>
                        <span className="text-red-600">✗ {slot.unavailableCount} 利用不可</span>
                        <span className="font-medium">スコア: {slot.score.toFixed(1)}%</span>
                      </div>
                    </div>
                    {meeting.status !== 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => manuallySelectTime(slot)}
                        className="glass-morphism-button"
                      >
                        この時間を選択
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {analysis.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  参加者の回答がありません。会議のリンクを共有して参加者と連携してください。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}