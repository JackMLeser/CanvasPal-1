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
    dueDate: Date;
    course: string;
    courseId?: string;
    gradeWeight?: number;
    courseGrade?: number;
    points?: number;
    maxPoints?: number;
    priorityScore: number;
    completed: boolean;
    type: string;
    url?: string;
    details?: AssignmentDetails;
}
export interface PriorityWeights {
    GRADE_IMPACT: number;
    COURSE_GRADE: number;
    DUE_DATE: number;
}
export interface AssignmentGroup {
    id: string;
    name: string;
    weight: number;
    courseId: string;
}
export interface Settings {
    priorityWeights: PriorityWeights;
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
    debugSettings: {
        enabled: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        showDateDebug: boolean;
        showAssignmentDebug: boolean;
        showPriorityDebug: boolean;
    };
    icalUrl?: string;
}
