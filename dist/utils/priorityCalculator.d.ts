import { Assignment, PriorityWeights } from '../types/models';
export declare class PriorityCalculator {
    private PRIORITY_WEIGHTS;
    private readonly TYPE_WEIGHTS;
    private logger;
    private debugPanel;
    private performanceMonitor;
    private debugManager;
    constructor();
    calculatePriority(assignment: Assignment): number;
    private calculateDaysUntilDue;
    private calculateDueDatePriority;
    private calculateGradeImpact;
    private calculateCourseGradeImpact;
    private getTypeWeight;
    private getDueStatus;
    private getPointsImpact;
    private getTypeImportance;
    setPriorityWeights(weights: Partial<PriorityWeights>): void;
}
