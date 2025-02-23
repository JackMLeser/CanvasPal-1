interface PerformanceLog {
    timestamp: number;
    metrics: {
        name: string;
        duration: number;
        metadata?: Record<string, any>;
    }[];
    summary: {
        totalDuration: number;
        averageDuration: number;
        slowestOperation: string;
        fastestOperation: string;
    };
}
type Trend = 'improving' | 'degrading' | 'stable';
export declare class PerformanceLogger {
    private logger;
    private static readonly MAX_LOGS;
    private static readonly STORAGE_KEY;
    constructor();
    logPerformance(metrics: {
        name: string;
        duration: number;
        metadata?: Record<string, any>;
    }[]): Promise<void>;
    private calculateSummary;
    getLogs(): Promise<PerformanceLog[]>;
    getPerformanceAnalysis(): Promise<{
        trends: {
            operation: string;
            averageDuration: number;
            trend: Trend;
            percentageChange: number;
        }[];
        hotspots: {
            operation: string;
            frequency: number;
            averageDuration: number;
        }[];
        recommendations: string[];
    }>;
    private calculateAverage;
    private calculateTrend;
    private generateRecommendations;
    clearLogs(): Promise<void>;
}
export {};
