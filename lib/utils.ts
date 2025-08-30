import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTimeSlots(
  startDate: Date, 
  endDate: Date, 
  startTime: string, 
  endTime: string
): Date[] {
  const slots: Date[] = [];
  const current = new Date(startDate);
  current.setDate(startDate.getDate());
  
  while (current <= endDate) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let timeSlot = new Date(current);
    timeSlot.setHours(startHour, startMinute, 0, 0);
    
    const endOfDay = new Date(current);
    endOfDay.setHours(endHour, endMinute, 0, 0);
    
    while (timeSlot < endOfDay) {
      slots.push(new Date(timeSlot));
      timeSlot = new Date(timeSlot.getTime() + 30 * 60 * 1000); // Add 30 minutes
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return slots;
}

export function formatTimeSlot(date: Date): string {
  return date.toLocaleDateString('ja-JP', { 
    weekday: 'short',
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function groupTimeSlotsByDate(slots: Date[]): Record<string, Date[]> {
  return slots.reduce((groups, slot) => {
    const dateKey = slot.toLocaleDateString('ja-JP');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(slot);
    return groups;
  }, {} as Record<string, Date[]>);
}
