'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { db, connectToEmulators } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { generateTimeSlots } from '@/lib/utils';
import { logFirebaseConfig, checkEmulatorConnection } from '@/lib/firebase-debug';

interface CreateMeetingFormProps {
  onSuccess?: (meetingId: string) => void;
}

export default function CreateMeetingForm({ onSuccess }: CreateMeetingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    deadline: undefined as Date | undefined,
    startTime: '09:00',
    endTime: '18:00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.deadline) {
      toast.error('すべての必須フィールドを入力してください');
      return;
    }

    if (formData.startDate >= formData.endDate) {
      toast.error('終了日は開始日より後にしてください');
      return;
    }

    if (formData.deadline <= new Date()) {
      toast.error('回答期限は会議実施日の前にしてください');
      return;
    }

    // Validate that deadline is after start date
    if (formData.deadline >= formData.startDate) {
      toast.error('回答期限は開始日より後にしてください');
      return;
    }

    const user = getCurrentUser();
    // For demo purposes, allow anonymous meeting creation
    const userId = user ? user.uid : 'anonymous-' + Date.now();

    setLoading(true);

    try {
      // Generate time slots between start and end dates
      const timeSlots = generateTimeSlots(
        formData.startDate,
        formData.endDate,
        formData.startTime,
        formData.endTime
      );

      const meetingData = {
        title: formData.title,
        description: formData.description,
        timeSlots: timeSlots,
        deadline: formData.deadline,
        creatorUid: userId,
        status: 'scheduling',
        confirmedDateTime: null,
        confirmedReason: null,
        createdAt: serverTimestamp(),
      };

      if (!db) {
        console.error('Firestore database is not initialized');
        toast.error('Firebaseが設定されていません。環境変数を設定してください。');
        return;
      }

      // Ensure emulator connection
      connectToEmulators();
      
      // Debug Firebase configuration
      logFirebaseConfig();
      checkEmulatorConnection(db);
      
      console.log('Attempting to create document in Firestore...');
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      console.log('Document created successfully with ID:', docRef.id);
      
      toast.success('会議が作成されました！');
      
      if (onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        toast.error('パーミッションが拒否されました。認証を確認してください。');
      } else if (error.code === 'unavailable') {
        toast.error('サービスが利用できません。Firebase emulatorsが実行されているか確認してください。');
      } else if (error.message?.includes('Firebase is not configured')) {
        toast.error('Firebaseの設定にエラーがあります。環境変数を確認してください。');
      } else {
        toast.error(`会議の作成に失敗しました: ${error.message || '不明なエラー'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>新しい会議を作成</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">会議のタイトル *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="会議のタイトルを入力してください"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="会議の説明を入力してください (任意)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日 *</Label>
              <Calendar
                mode="single"
                selected={formData.startDate}
                onSelect={(date) => setFormData({ ...formData, startDate: date })}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            
            <div className="space-y-2">
              <Label>終了日 *</Label>
              <Calendar
                mode="single"
                selected={formData.endDate}
                onSelect={(date) => setFormData({ ...formData, endDate: date })}
                disabled={(date) => {
                  if (date < new Date()) return true;
                  if (formData.startDate && date <= formData.startDate) return true;
                  return false;
                }}
                className="rounded-md border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">開始時間</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">終了時間</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>回答期限 *</Label>
            <Calendar
              mode="single"
              selected={formData.deadline}
              onSelect={(date) => setFormData({ ...formData, deadline: date })}
              disabled={(date) => date <= new Date()}
              className="rounded-md border"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '作成しています...' : '会議を作成'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}