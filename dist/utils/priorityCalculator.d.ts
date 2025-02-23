import { Assignment, PriorityWeights } from '../types/models';
export declare class PriorityCalculator {
    private readonly PRIORITY_WEIGHTS;
    private logger;
    private debugPanel;
    private performanceMonitor;
    constructor();
    calculatePriority(assignment: Assignment): number;
    private calculateDaysUntilDue;
    private calculateDueDatePriority;
    private calculateGradeImpact;
    private calculateCourseGradeImpact;
    private getTypeWeight;
    setPriorityWeights(weights: Partial<PriorityWeights>): void;
}
