import type { CalendarEvent, PrioritySettings } from '../types/models';
interface EnrichedEvent extends CalendarEvent {
    dueDate: Date;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}
export declare const calculatePriority: (event: EnrichedEvent, settings: PrioritySettings) => number;
export type { PrioritySettings };
