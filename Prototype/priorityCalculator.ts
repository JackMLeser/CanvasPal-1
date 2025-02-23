import { PriorityLevel, PriorityThresholds, PriorityWeights, DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS } from './priorities';
import { Priority, PriorityAssignment } from './priority';

export interface Assignment {
    title: string;
    dueDate: Date;
    courseId: string;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
    completed: boolean;
}

export class PriorityCalculator {
    private thresholds: PriorityThresholds;
    private weights: PriorityWeights;

    constructor(
        thresholds: PriorityThresholds = DEFAULT_THRESHOLDS,
        weights: PriorityWeights = DEFAULT_WEIGHTS
    ) {
        this.thresholds = thresholds;
        this.weights = weights;
    }

    calculatePriority(assignment: PriorityAssignment): Priority {
        const timeUrgency = this.calculateTimeUrgency(assignment.dueDate);
        const pointsWeight = this.calculatePointsWeight(assignment.points, assignment.maxPoints);
        const courseWeight = this.calculateCourseWeight(assignment.courseWeight);

        const score = 
            timeUrgency * this.weights.DUE_DATE +
            pointsWeight * this.weights.POINTS +
            courseWeight * this.weights.COURSE_WEIGHT;

        return {
            level: this.getPriorityLevel(score),
            score,
            factors: {
                timeUrgency,
                pointsWeight,
                courseWeight
            }
        };
    }

    private calculateTimeUrgency(dueDate: Date | string): number {
        const due = new Date(dueDate);
        const now = new Date();
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Higher urgency for assignments due sooner
        return Math.max(0, Math.min(1, 7 / daysUntilDue));
    }

    private calculatePointsWeight(points: number, maxPoints: number = 100): number {
        return Math.min(1, points / maxPoints);
    }

    private calculateCourseWeight(weight: number = 1): number {
        return Math.min(1, weight);
    }

    private getPriorityLevel(score: number): PriorityLevel {
        if (score >= this.thresholds.HIGH) return PriorityLevel.HIGH;
        if (score >= this.thresholds.MEDIUM) return PriorityLevel.MEDIUM;
        return PriorityLevel.LOW;
    }
}
