'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { formatTimeSlot, groupTimeSlotsByDate } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';

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

interface SchedulingGridProps {
  meetingId: string;
  isHost?: boolean;
}

export default function SchedulingGrid({ meetingId, isHost = false }: SchedulingGridProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAvailability, setUserAvailability] = useState<Record<string, Availability>>({});
  const [userName, setUserName] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    
    if (!db) {
      setLoading(false);
      toast.error('Firebase is not configured. Please set up your environment variables.');
      return;
    }

    // Listen to meeting data
    const unsubscribeMeeting = onSnapshot(doc(db, 'meetings', meetingId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMeeting({
          id: doc.id,
          ...data,
          timeSlots: data.timeSlots?.map((ts: { toDate: () => Date }) => ts.toDate()) || [],
          deadline: data.deadline?.toDate(),
          confirmedDateTime: data.confirmedDateTime?.toDate(),
        } as Meeting);
      }
      setLoading(false);
    });

    // Listen to participants data  
    const unsubscribeParticipants = onSnapshot(
      collection(db, 'meetings', meetingId, 'availabilities'),
      (snapshot) => {
        const participantData = snapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data(),
        })) as Participant[];
        setParticipants(participantData);

        // Set current user's availability if exists
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

  const handleAvailabilityChange = (timeSlotKey: string, status: AvailabilityStatus) => {
    setUserAvailability(prev => ({
      ...prev,
      [timeSlotKey]: { status, comment: prev[timeSlotKey]?.comment || '' }
    }));
  };

  const handleCommentChange = (timeSlotKey: string, comment: string) => {
    setUserAvailability(prev => ({
      ...prev,
      [timeSlotKey]: { ...prev[timeSlotKey], comment }
    }));
  };

  const saveAvailability = async () => {
    if (!user || !userName.trim()) {
      if (!user) {
        toast.error('Please sign in to save availability');
        return;
      }
      toast.error('Please enter your name');
      return;
    }

    try {
      if (!db) {
        toast.error('Firebase is not configured. Please set up your environment variables.');
        return;
      }
      
      await setDoc(doc(db, 'meetings', meetingId, 'availabilities', user.uid), {
        userName: userName.trim(),
        schedule: userAvailability,
        updatedAt: new Date(),
      });
      toast.success('Availability saved successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability');
    }
  };

  const runAISuggestion = async () => {
    if (!isHost) return;
    
    setAiLoading(true);
    try {
      // This would call the AI suggestion Cloud Function
      const response = await fetch(`/api/run-ai-suggestion/${meetingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        toast.success('AI suggestion completed!');
      } else {
        toast.error('AI suggestion failed');
      }
    } catch (error) {
      console.error('Error running AI suggestion:', error);
      toast.error('Failed to run AI suggestion');
    } finally {
      setAiLoading(false);
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
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!meeting) {
    return <div className="text-center">Meeting not found</div>;
  }

  if (meeting.status === 'confirmed' && meeting.confirmedDateTime) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Meeting Confirmed!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p><strong>Meeting:</strong> {meeting.title}</p>
            <p><strong>Date & Time:</strong> {formatTimeSlot(meeting.confirmedDateTime)}</p>
            {meeting.confirmedReason && (
              <p><strong>AI Decision Reason:</strong> {meeting.confirmedReason}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedTimeSlots = groupTimeSlotsByDate(meeting.timeSlots);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{meeting.title}</CardTitle>
          <p className="text-muted-foreground">{meeting.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span>Deadline: {meeting.deadline.toLocaleDateString('ja-JP')}</span>
            <span>Participants: {participants.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {!user && (
            <div className="mb-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Input
                  placeholder="Enter your name to participate"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Button onClick={saveAvailability}>
                  Participate in Meeting
                </Button>
              </div>
            </div>
          )}

          {user && (
            <div className="mb-4 space-y-2">
              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <Button onClick={saveAvailability}>Save Availability</Button>
              {isHost && (
                <Button 
                  onClick={runAISuggestion} 
                  disabled={aiLoading}
                  variant="outline"
                >
                  {aiLoading ? 'Running AI Suggestion...' : 'Run AI Suggestion'}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(groupedTimeSlots).map(([dateKey, timeSlots]) => (
              <div key={dateKey}>
                <h3 className="font-semibold mb-3">{dateKey}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {timeSlots.map((timeSlot) => {
                    const timeSlotKey = timeSlot.toISOString();
                    const userStatus = userAvailability[timeSlotKey]?.status;
                    const counts = getAvailabilityCount(timeSlotKey);
                    const hasComment = userAvailability[timeSlotKey]?.comment;

                    return (
                      <div
                        key={timeSlotKey}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="font-medium text-sm">
                          {timeSlot.toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        
                        <div className="flex gap-1">
                          {(['available', 'maybe', 'unavailable'] as const).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={userStatus === status ? 'default' : 'outline'}
                              onClick={() => handleAvailabilityChange(timeSlotKey, status)}
                            >
                              {getStatusIcon(status)}
                            </Button>
                          ))}
                          
                          {hasComment && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Comment</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  <Textarea
                                    value={userAvailability[timeSlotKey]?.comment || ''}
                                    onChange={(e) => handleCommentChange(timeSlotKey, e.target.value)}
                                    placeholder="Add a comment..."
                                  />
                                  <Button onClick={() => {}}>
                                    Save Comment
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>

                        <div className="flex gap-1 text-xs">
                          <Badge variant="outline" className="text-green-600">
                            ✓{counts.available}
                          </Badge>
                          <Badge variant="outline" className="text-yellow-600">
                            △{counts.maybe}
                          </Badge>
                          <Badge variant="outline" className="text-red-600">
                            ✗{counts.unavailable}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {participants.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Participants</h3>
              <div className="space-y-2">
                {participants.map((participant) => (
                  <Badge key={participant.userId} variant="secondary">
                    {participant.userName}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}