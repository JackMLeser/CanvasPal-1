export interface CalendarEvent {
    title: string;
    dueDate: Date;
    courseId: string;
    assignmentId: string;
}

export interface PrioritySettings {
    dueDateWeight: number;
    gradeWeight: number;
    difficultyWeight: number;
}

export interface GradeData {
    courseName: string;
    assignments: Array<{
        name: string;
        weight: number;
        points: number;
        pointsPossible: number;
    }>;
}

export type AssignmentType = 'assignment' | 'quiz' | 'discussion' | 'announcement';

export interface AssignmentDetails {
    submissionType?: string[];
    isCompleted: boolean;
    isLocked: boolean;
    description?: string;
}

export interface Assignment {
    id: string;
    title: string;
    description: string;
    courseName: string;
    courseId: string;
    dueDate: Date;
    gradeWeight?: number;
    courseGrade?: number;
    priority: number;
    completed: boolean;
    type: 'quiz' | 'assignment' | 'discussion' | 'announcement';
    url?: string;
}

export interface Course {
    id: string;
    name: string;
    code: string;
    grade?: number;
}

export interface PriorityWeights {
    GRADE_IMPACT: number;
    COURSE_GRADE: number;
    DUE_DATE: number;
}

export interface DateMatch {
    type: 'due' | 'availability' | 'unlock' | 'unknown';
    date: Date;
    confidence: number;
    pattern: string;
    matchedText: string;
}

export interface DebugInfo {
    dateMatches: DateMatch[];
    confidence: number;
    patterns: string[];
    matchedText: string[];
}

export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration: number;
    metadata?: Record<string, any>;
}

export interface PerformanceAnalysis {
    operation: string;
    averageDuration: number;
    trend: 'improving' | 'degrading' | 'stable';
    percentageChange: number;
}

export interface AssignmentGroup {
    id: string;
    name: string;
    weight: number;
    courseId: string;
}
