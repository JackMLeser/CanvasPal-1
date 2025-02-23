import { Assignment } from '../types/models';
export declare class DebugPanel {
    private panel;
    private logger;
    private performanceMonitor;
    private isVisible;
    private debugManager;
    constructor(debugManager: {
        isDebugEnabled(): boolean;
    });
    private createPanel;
    private initializeKeyboardShortcut;
    toggleVisibility(): void;
    private updatePerformanceMetrics;
    private getMetricSpeedClass;
    updateAssignmentInfo(assignments: Assignment[]): void;
    private getAssignmentTypeCounts;
    private getPriorityRanges;
    private renderTypeCounts;
    private renderPriorityDistribution;
    private renderAssignmentList;
    private renderAssignmentDetail;
    logDetectionEvent(message: string, data?: any): void;
    private formatDate;
    updatePerformanceAnalysis(analysis: any): void;
}
