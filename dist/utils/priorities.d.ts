import type { CalendarEvent, PrioritySettings } from '../types/models';
export interface EnrichedEvent extends CalendarEvent {
    dueDate: string;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}
export declare const calculatePriority: (event: EnrichedEvent, settings: PrioritySettings) => number;
export type { PrioritySettings };
