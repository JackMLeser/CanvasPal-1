interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}
interface PerformanceReport {
    metrics: PerformanceMetric[];
    summary: {
        totalDuration: number;
        averageDuration: number;
        slowestOperation: {
            name: string;
            duration: number;
        };
        fastestOperation: {
            name: string;
            duration: number;
        };
    };
}
export declare class PerformanceMonitor {
    private metrics;
    private logger;
    private static instance;
    private constructor();
    static getInstance(): PerformanceMonitor;
    startMetric(name: string, metadata?: Record<string, any>): string;
    endMetric(name: string): void;
    getReport(): PerformanceReport;
    clear(): void;
    monitorAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    monitor<T>(name: string, fn: () => T, metadata?: Record<string, any>): T;
}
export {};
