import { Assignment, PriorityWeights } from '../types/models';
import { logger } from './logger';
import { PerformanceMonitor } from './performanceMonitor';

class PriorityCalculator {
    private performanceMonitor: PerformanceMonitor;

    constructor() {
        this.performanceMonitor = new PerformanceMonitor();
    }

    public calculatePriority(assignment: Assignment, weights: PriorityWeights): number {
        return this.performanceMonitor.measure('calculatePriority', () => {
            const dueDateScore = this.calculateDueDateScore(assignment.dueDate);
            const gradeImpactScore = this.calculateGradeImpactScore(assignment.gradeWeight || 0);
            const courseGradeScore = this.calculateCourseGradeScore(assignment.courseGrade || 0);

            return (
                dueDateScore * weights.DUE_DATE +
                gradeImpactScore * weights.GRADE_IMPACT +
                courseGradeScore * weights.COURSE_GRADE
            );
        });
    }

    private calculateDueDateScore(dueDate: Date): number {
        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();
        const daysUntilDue = diff / (1000 * 60 * 60 * 24);

        if (daysUntilDue < 0) return 1; // Past due
        if (daysUntilDue <= 1) return 0.9; // Due within 24 hours
        if (daysUntilDue <= 3) return 0.8; // Due within 3 days
        if (daysUntilDue <= 7) return 0.6; // Due within a week
        if (daysUntilDue <= 14) return 0.4; // Due within 2 weeks
        return 0.2; // Due in more than 2 weeks
    }

    private calculateGradeImpactScore(gradeWeight: number): number {
        if (gradeWeight >= 30) return 1;
        if (gradeWeight >= 20) return 0.8;
        if (gradeWeight >= 10) return 0.6;
        if (gradeWeight >= 5) return 0.4;
        return 0.2;
    }

    private calculateCourseGradeScore(currentGrade: number): number {
        if (currentGrade < 65) return 1;
        if (currentGrade < 70) return 0.9;
        if (currentGrade < 75) return 0.8;
        if (currentGrade < 80) return 0.7;
        if (currentGrade < 85) return 0.6;
        if (currentGrade < 90) return 0.4;
        return 0.2;
    }
}

export const priorityCalculator = new PriorityCalculator();
