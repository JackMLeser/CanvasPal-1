import { Assignment } from '../types/models';
export declare class AssignmentDetector {
    private logger;
    private debugPanel;
    private dateDebugger;
    private performanceMonitor;
    private debugManager;
    private priorityCalculator;
    constructor();
    detectAssignments(): Promise<Assignment[]>;
    private validateAssignmentDates;
    private fetchPlannerItems;
    private fetchMissingSubmissions;
    private parseDashboardCards;
    private convertPlannerItem;
    private convertMissingSubmission;
    private convertDashboardAssignment;
    private determineAssignmentType;
    private isValidAssignment;
}
