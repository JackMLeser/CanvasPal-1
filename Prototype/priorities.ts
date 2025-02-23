import type { CalendarEvent, PrioritySettings } from '../types/models';

export const calculatePriority = (
    event: CalendarEvent, 
    settings: PrioritySettings
): number => {
    const daysUntilDue = (event.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const dueScore = Math.max(0, 10 - daysUntilDue);
    return dueScore * settings.dueDateWeight;
};

export type { PrioritySettings };

// Define priority levels and their thresholds
export enum PriorityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface PriorityThresholds {
  HIGH: number;
  MEDIUM: number;
}

export const DEFAULT_THRESHOLDS: PriorityThresholds = {
  HIGH: 0.7,
  MEDIUM: 0.4
};

export interface PriorityWeights {
  DUE_DATE: number;
  POINTS: number;
  COURSE_WEIGHT: number;
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  DUE_DATE: 0.6,
  POINTS: 0.3,
  COURSE_WEIGHT: 0.1
};
