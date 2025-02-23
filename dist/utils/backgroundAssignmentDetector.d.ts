import { Assignment } from '../types/models';
export declare class BackgroundAssignmentDetector {
    private logger;
    constructor();
    detectAssignments(): Promise<Assignment[]>;
    private fetchPlannerItems;
    private fetchMissingSubmissions;
    private parseDashboardCards;
    private convertPlannerItem;
    private convertMissingSubmission;
    private convertDashboardAssignment;
    private determineAssignmentType;
    private isValidAssignment;
}
