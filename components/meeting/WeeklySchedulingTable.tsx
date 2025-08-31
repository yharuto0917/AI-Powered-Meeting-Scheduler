'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle2, XCircle, AlertTriangle, Users, Settings, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

type AvailabilityStatus = 'available' | 'maybe' | 'unavailable';

interface Availability {
  status: AvailabilityStatus;
  comment?: string;
}

interface Participant {
  userId: string;
  userName: string;
  schedule: Record<string, Availability>;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  timeSlots: Date[];
  deadline: Date;
  creatorUid: string;
  status: 'scheduling' | 'confirmed' | 'canceled';
  confirmedDateTime?: Date;
  confirmedReason?: string;
}

interface WeeklySchedulingTableProps {
  meetingId: string;
  isHost?: boolean;
}

interface TimeSlotData {
  time: string;
  timeKey: string;
  slots: Array<{
    date: Date;
    dateKey: string;
    timeSlotKey: string;
  }>;
}

export default function WeeklySchedulingTable({ meetingId, isHost = false }: WeeklySchedulingTableProps) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAvailability, setUserAvailability] = useState<Record<string, Availability>>({});
  const [userName, setUserName] = useState('');
  const [bulkSelection, setBulkSelection] = useState<AvailabilityStatus>('available');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  const user = getCurrentUser();

  useEffect(() => {
    if (!meetingId || !db) {
      setLoading(false);
      return;
    }

    const toDateSafe = (value: any): Date | undefined => {
      if (!value) return undefined;
      try {
        if (typeof value.toDate === 'function') return value.toDate();
        if (value instanceof Date) return value;
        if (typeof value === 'string') {
          const d = new Date(value);
          return isNaN(d.getTime()) ? undefined : d;
        }
      } catch (_) {}
      return undefined;
    };

    const unsubscribeMeeting = onSnapshot(doc(db, 'meetings', meetingId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMeeting({
          id: doc.id,
          ...data,
          timeSlots: Array.isArray(data.timeSlots)
            ? (data.timeSlots.map((ts: any) => toDateSafe(ts)).filter(Boolean) as Date[])
            : [],
          deadline: toDateSafe(data.deadline) as Date,
          confirmedDateTime: toDateSafe(data.confirmedDateTime),
        } as Meeting);
      }
      setLoading(false);
    });

    const unsubscribeParticipants = onSnapshot(
      collection(db, 'meetings', meetingId, 'availabilities'),
      (snapshot) => {
        const participantData = snapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data(),
        })) as Participant[];
        setParticipants(participantData);

        if (user) {
          const currentUserData = participantData.find(p => p.userId === user.uid);
          if (currentUserData) {
            setUserAvailability(currentUserData.schedule || {});
            setUserName(currentUserData.userName || '');
          }
        }
      }
    );

    return () => {
      unsubscribeMeeting();
      unsubscribeParticipants();
    };
  }, [meetingId, user]);

  const groupTimeSlotsByWeek = (timeSlots: Date[]): { dates: string[], timeSlotData: TimeSlotData[] } => {
    if (!timeSlots.length) return { dates: [], timeSlotData: [] };

    // グループ化：日付別
    const dateGroups: Record<string, Date[]> = {};
    timeSlots.forEach(slot => {
      const dateKey = slot.toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(slot);
    });

    // 日付のソート
    const sortedDates = Object.keys(dateGroups).sort();

    // 時間スロット別にグループ化
    const timeGroups: Record<string, Array<{ date: Date; dateKey: string; timeSlotKey: string }>> = {};
    
    Object.entries(dateGroups).forEach(([dateKey, slots]) => {
      slots.forEach(slot => {
        const timeKey = slot.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = [];
        }
        timeGroups[timeKey].push({
          date: slot,
          dateKey,
          timeSlotKey: slot.toISOString()
        });
      });
    });

    // 時間でソート
    const sortedTimes = Object.keys(timeGroups).sort();
    const timeSlotData: TimeSlotData[] = sortedTimes.map(time => ({
      time,
      timeKey: time,
      slots: sortedDates.map(dateKey => {
        const slot = timeGroups[time].find(s => s.dateKey === dateKey);
        return slot || { date: new Date(), dateKey, timeSlotKey: '' };
      }).filter(s => s.timeSlotKey !== '')
    }));

    return { dates: sortedDates, timeSlotData };
  };

  const handleAvailabilityChange = (timeSlotKey: string, status: AvailabilityStatus) => {
    setUserAvailability(prev => ({
      ...prev,
      [timeSlotKey]: { status, comment: prev[timeSlotKey]?.comment || '' }
    }));
  };

  const handleSlotSelection = (timeSlotKey: string, checked: boolean) => {
    const newSelected = new Set(selectedSlots);
    if (checked) {
      newSelected.add(timeSlotKey);
    } else {
      newSelected.delete(timeSlotKey);
    }
    setSelectedSlots(newSelected);
  };

  const handleBulkUpdate = () => {
    const updates = { ...userAvailability };
    selectedSlots.forEach(timeSlotKey => {
      updates[timeSlotKey] = {
        status: bulkSelection,
        comment: updates[timeSlotKey]?.comment || ''
      };
    });
    setUserAvailability(updates);
    setSelectedSlots(new Set());
    toast.success(`Updated ${selectedSlots.size} slots to ${bulkSelection}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && meeting) {
      const allSlots = new Set(meeting.timeSlots.map(slot => slot.toISOString()));
      setSelectedSlots(allSlots);
    } else {
      setSelectedSlots(new Set());
    }
  };

  const saveAvailability = async () => {
    if (!user || !userName.trim()) {
      if (!user) {
        toast.error('Availabilityを保存するにはサインインしてください');
        return;
      }
      toast.error('参加者の名前を入力してください');
      return;
    }

    try {
      if (!db) {
        toast.error('Firebaseが設定されていません。環境変数を設定してください。');
        return;
      }
      
      await setDoc(doc(db, 'meetings', meetingId, 'availabilities', user.uid), {
        userName: userName.trim(),
        schedule: userAvailability,
        updatedAt: new Date(),
      });
      toast.success('Availabilityが保存されました！');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Availabilityが保存に失敗しました。');
    }
  };

  const getStatusIcon = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'maybe':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'unavailable':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getAvailabilityCount = (timeSlotKey: string) => {
    const counts = { available: 0, maybe: 0, unavailable: 0 };
    participants.forEach(participant => {
      const availability = participant.schedule[timeSlotKey];
      if (availability) {
        counts[availability.status]++;
      }
    });
    return counts;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">読み込んでいます...</div>;
  }

  if (!meeting) {
    return <div className="text-center">会議が見つかりません</div>;
  }

  const { dates, timeSlotData } = groupTimeSlotsByWeek(meeting.timeSlots);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card className="glass-morphism-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {meeting.title}
                {meeting.status === 'confirmed' && meeting.confirmedDateTime && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    会議が確定しました
                  </Badge>
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1">{meeting.description}</p>
              {meeting.status === 'confirmed' && meeting.confirmedDateTime && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    📅 会議が確定しました: {new Date(meeting.confirmedDateTime).toLocaleString()}
                  </p>
                  {meeting.confirmedReason && (
                    <p className="text-xs text-green-700 mt-1">{meeting.confirmedReason}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-sm mt-2">
                <span>回答期限: {meeting.deadline.toLocaleDateString('ja-JP')}</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{participants.length} 参加者</span>
                </div>
              </div>
            </div>
            
            {/* Host Management Controls */}
            {isHost && user && meeting.creatorUid === user.uid && (
              <div className="flex gap-2">
                {meeting.status !== 'confirmed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/meeting/${meetingId}/manage`)}
                    className="glass-morphism-button flex items-center gap-1"
                  >
                    <Brain className="w-4 h-4" />
                    AIの決定
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/meeting/${meetingId}/manage`)}
                  className="glass-morphism-button flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  管理
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* User Input Section */}
          <div className="mb-6 space-y-4">
            <Input
              placeholder="参加者の名前"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="max-w-xs"
            />
            
            {/* Bulk Selection Controls */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSlots.size === meeting.timeSlots.length}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium">すべて選択</label>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm">一括で選択:</span>
                <select
                  value={bulkSelection}
                  onChange={(e) => setBulkSelection(e.target.value as AvailabilityStatus)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="available">利用可能</option>
                  <option value="maybe">わからない</option>
                  <option value="unavailable">利用不可</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleBulkUpdate}
                  disabled={selectedSlots.size === 0}
                >
                  更新 ({selectedSlots.size})
                </Button>
              </div>
            </div>
          </div>

          {/* Scheduling Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 text-black">時間</TableHead>
                  {dates.map(date => (
                    <TableHead key={date} className="text-center min-w-32 text-black">
                      {date}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlotData.map(timeRow => (
                  <TableRow key={timeRow.timeKey}>
                    <TableCell className="font-medium">
                      {timeRow.time}
                    </TableCell>
                    {dates.map(dateKey => {
                      const slot = timeRow.slots.find(s => s.dateKey === dateKey);
                      if (!slot || !slot.timeSlotKey) {
                        return <TableCell key={`${timeRow.timeKey}-${dateKey}`} className="text-center text-gray-300">-</TableCell>;
                      }

                      const timeSlotKey = slot.timeSlotKey;
                      const userStatus = userAvailability[timeSlotKey]?.status;
                      const counts = getAvailabilityCount(timeSlotKey);
                      const isSelected = selectedSlots.has(timeSlotKey);

                      return (
                        <TableCell key={`${timeRow.timeKey}-${dateKey}`} className="text-center p-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSlotSelection(timeSlotKey, checked as boolean)}
                                className="mr-2"
                              />
                            </div>
                            
                            <div className="flex justify-center gap-1">
                              {(['available', 'maybe', 'unavailable'] as const).map((status) => (
                                <Button
                                  key={`${timeSlotKey}-${status}`}
                                  size="sm"
                                  variant={userStatus === status ? 'default' : 'ghost'}
                                  onClick={() => handleAvailabilityChange(timeSlotKey, status)}
                                  className="p-1"
                                >
                                  {getStatusIcon(status)}
                                </Button>
                              ))}
                            </div>
                            
                            <div className="flex justify-center gap-1">
                              <Badge variant="outline" className="text-xs px-1">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                                {counts.available}
                              </Badge>
                              <Badge variant="outline" className="text-xs px-1">
                                <AlertTriangle className="w-3 h-3 mr-1 text-yellow-600" />
                                {counts.maybe}
                              </Badge>
                              <Badge variant="outline" className="text-xs px-1">
                                <XCircle className="w-3 h-3 mr-1 text-red-600" />
                                {counts.unavailable}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button onClick={saveAvailability} className="glass-morphism-button">
              Availabilityを保存
            </Button>
            
            {participants.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">参加者:</span>
                <div className="flex gap-1 flex-wrap">
                  {participants.map((participant, index) => (
                    <Badge key={`badge-${participant.userId}-${index}`} variant="secondary">
                      {participant.userName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}