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

export interface Assignment {
    id: string;
    title: string;
    dueDate: Date;
    course: string;  // Changed from courseId to course to match existing usage
    courseId: string;
    type: string;
    priorityScore: number;
    completed: boolean;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
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
    description: string;
    startDate: Date;
    endDate: Date;
    courseId: string;
    type: string;
}

export interface PrioritySettings {
    gradeImpactWeight: number;
    dueDateWeight: number;
    courseGradeWeight: number;
}
