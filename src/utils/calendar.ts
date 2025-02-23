import * as ICAL from 'ical.js';
import type { CalendarEvent } from '../types/models';
import { Assignment } from '../types/models';
import { logger } from './logger';

export const parseICalFeed = (icalData: string): CalendarEvent[] => {
  const jCalData = ICAL.parse(icalData);
  const comp = new ICAL.Component(jCalData);
  const vevents = comp.getAllSubcomponents('vevent');
  
  return vevents.map(vevent => {
    const event = new ICAL.Event(vevent);
    return {
      title: event.summary,
      dueDate: event.startDate.toJSDate(),
      courseId: event.uid.split('_')[0],
      assignmentId: event.uid.split('_')[1]
    };
  });
};

export type { CalendarEvent };

export async function fetchCalendarEvents(calendarUrl: string): Promise<Assignment[]> {
    try {
        const response = await fetch(calendarUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch calendar: ${response.statusText}`);
        }

        const data = await response.json();
        return parseCalendarEvents(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error fetching calendar events:', errorMessage);
        throw error;
    }
}

function parseCalendarEvents(data: any): Assignment[] {
    if (!Array.isArray(data.events)) {
        logger.error('Invalid calendar data format');
        return [];
    }

    return data.events
        .filter((event: any) => isValidAssignment(event))
        .map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description || '',
            courseName: event.context_name || '',
            courseId: event.context_code?.replace('course_', '') || '',
            dueDate: new Date(event.end_at),
            type: determineAssignmentType(event),
            completed: false,
            priority: 0 // This will be calculated later
        }));
}

function isValidAssignment(event: any): boolean {
    return (
        event &&
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.end_at === 'string' &&
        isValidDate(event.end_at)
    );
}

function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

function determineAssignmentType(event: any): Assignment['type'] {
    const title = event.title.toLowerCase();
    
    if (title.includes('quiz') || title.includes('exam') || title.includes('test')) {
        return 'quiz';
    }
    if (title.includes('discussion')) {
        return 'discussion';
    }
    if (title.includes('announcement')) {
        return 'announcement';
    }
    return 'assignment';
}
