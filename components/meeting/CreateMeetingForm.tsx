'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { generateTimeSlots } from '@/lib/utils';

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
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.startDate >= formData.endDate) {
      toast.error('End date must be after start date');
      return;
    }

    if (formData.deadline <= new Date()) {
      toast.error('Deadline must be in the future');
      return;
    }

    // Validate that deadline is after start date
    if (formData.deadline <= formData.startDate) {
      toast.error('Deadline must be after the start date');
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
        toast.error('Firebase is not configured. Please set up your environment variables.');
        return;
      }
      
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      
      toast.success('Meeting created successfully!');
      
      if (onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check your authentication.');
      } else if (error.code === 'unavailable') {
        toast.error('Service unavailable. Please check if Firebase emulators are running.');
      } else if (error.message.includes('Firebase is not configured')) {
        toast.error('Firebase configuration error. Please check your environment variables.');
      } else {
        toast.error(`Failed to create meeting: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter meeting title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter meeting description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Calendar
                mode="single"
                selected={formData.startDate}
                onSelect={(date) => setFormData({ ...formData, startDate: date })}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            
            <div className="space-y-2">
              <Label>End Date *</Label>
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
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Response Deadline *</Label>
            <Calendar
              mode="single"
              selected={formData.deadline}
              onSelect={(date) => setFormData({ ...formData, deadline: date })}
              disabled={(date) => date <= new Date()}
              className="rounded-md border"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Meeting'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}