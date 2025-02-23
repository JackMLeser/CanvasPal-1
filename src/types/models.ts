export interface GradeData {
    courseName: string;
    assignments: {
        name: string;
        points: number;
        pointsPossible: number;
        weight?: number;
    }[];
}

export interface DashboardData {
    courseName: string;
    assignments: {
        name: string;
        dueDate: string;
        type: string;
    }[];
}

export interface AssignmentDetails {
    submissionType?: string[];
    isCompleted: boolean;
    isLocked: boolean;
    description?: string;
}

export type AssignmentType = 'quiz' | 'assignment' | 'discussion' | 'announcement';

export interface Assignment {
    id: string;
    title: string;
    dueDate: string; // ISO date string
    course: string;
    courseId: string;
    type: AssignmentType | string;
    points: number;
    maxPoints: number;
    completed: boolean;
    priorityScore: number;
    url: string;
    details: AssignmentDetails;
    courseGrade?: number;
    gradeWeight?: number;
}

export interface EnrichedEvent extends CalendarEvent {
    dueDate: Date;
}

export type LogLevel = 'info' | 'error' | 'debug' | 'warn';

export interface DebugConfig {
    enabled: boolean;
    logLevel: LogLevel;
    showDateDebug: boolean;
    showAssignmentDebug: boolean;
    showPriorityDebug: boolean;
}

export interface Settings {
    priorityWeights: {
        GRADE_IMPACT: number;
        COURSE_GRADE: number;
        DUE_DATE: number;
    };
    typeWeights: {
        quiz: number;
        assignment: number;
        discussion: number;
        announcement: number;
    };
    displayOptions: {
        showCourseNames: boolean;
        showGradeImpact: boolean;
        showPriorityScores: boolean;
        highlightOverdue: boolean;
    };
    refreshInterval: number;
    debugSettings: DebugConfig;
    icalUrl: string;
}

export interface CalendarEvent {
    title: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    courseId: string;
    type?: string;
    dueDate?: Date;
    assignmentId?: string;
}

export interface PrioritySettings {
    dueDateWeight: number;
    gradeWeight: number;
    difficultyWeight: number;
}

export interface PriorityWeights {
    GRADE_IMPACT: number;
    COURSE_GRADE: number;
    DUE_DATE: number;
}
