import { logger } from '../logger';
import { PerformanceMonitor } from '../performanceMonitor';
import { PerformanceMetric, PerformanceAnalysis } from '../../types/models';

export class PerformanceLogger {
    private monitor: PerformanceMonitor;
    private logInterval: number | null = null;
    private enabled: boolean = false;
    private metricHistory: Map<string, PerformanceMetric[]> = new Map();

    constructor(monitor: PerformanceMonitor) {
        this.monitor = monitor;
    }

    public enable(intervalMs: number = 5000): void {
        this.enabled = true;
        this.monitor.enable();
        this.startLogging(intervalMs);
    }

    public disable(): void {
        this.enabled = false;
        this.monitor.disable();
        this.stopLogging();
    }

    private startLogging(intervalMs: number): void {
        if (this.logInterval !== null) {
            this.stopLogging();
        }

        this.logInterval = window.setInterval(() => {
            this.logMetrics();
        }, intervalMs);
    }

    private stopLogging(): void {
        if (this.logInterval !== null) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    }

    private logMetrics(): void {
        if (!this.enabled) return;

        const metrics = this.monitor.getAllMetrics();
        if (metrics.length === 0) return;

        logger.group('Performance Metrics');

        metrics.forEach((metric: PerformanceMetric) => {
            if (metric.duration !== undefined) {
                logger.info(`${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata || {});
                this.updateMetricHistory(metric);
            }
        });

        logger.groupEnd();

        // Clear metrics after logging
        this.monitor.clearMetrics();
    }

    private updateMetricHistory(metric: PerformanceMetric): void {
        const history = this.metricHistory.get(metric.name) || [];
        history.push(metric);

        // Keep only last 100 metrics for each operation
        if (history.length > 100) {
            history.shift();
        }

        this.metricHistory.set(metric.name, history);
    }

    public getAnalysis(): PerformanceAnalysis[] {
        const analysis: PerformanceAnalysis[] = [];

        this.metricHistory.forEach((metrics, operation) => {
            if (metrics.length < 2) return;

            const recentMetrics = metrics.slice(-10);
            const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;

            const oldAverage = metrics.slice(-20, -10).reduce((sum, m) => sum + m.duration, 0) / 10;
            const percentageChange = ((averageDuration - oldAverage) / oldAverage) * 100;

            analysis.push({
                operation,
                averageDuration,
                trend: this.determineTrend(percentageChange),
                percentageChange
            });
        });

        return analysis;
    }

    private determineTrend(percentageChange: number): 'improving' | 'degrading' | 'stable' {
        if (percentageChange <= -5) return 'improving';
        if (percentageChange >= 5) return 'degrading';
        return 'stable';
    }

    public async withLogging<T>(
        name: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        if (!this.enabled) {
            return fn();
        }

        return this.monitor.measureAsync(name, fn, metadata);
    }

    public withSyncLogging<T>(
        name: string,
        fn: () => T,
        metadata?: Record<string, any>
    ): T {
        if (!this.enabled) {
            return fn();
        }

        return this.monitor.measure(name, fn, metadata);
    }
} 