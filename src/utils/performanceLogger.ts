import { Logger } from './logger';

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

interface PerformanceMetric {
    name: string;
    duration: number;
    metadata?: Record<string, any>;
    trend?: Trend;
}

export class PerformanceLogger {
    private logger: Logger;
    private static readonly MAX_LOGS = 100;
    private static readonly STORAGE_KEY = 'performanceLogs';

    constructor() {
        this.logger = new Logger('PerformanceLogger');
    }

    public async logPerformance(metrics: { name: string; duration: number; metadata?: Record<string, any> }[]): Promise<void> {
        try {
            const logs = await this.getLogs();
            const log: PerformanceLog = {
                timestamp: Date.now(),
                metrics,
                summary: this.calculateSummary(metrics)
            };
            
            logs.unshift(log);
            
            // Keep only the most recent logs
            while (logs.length > PerformanceLogger.MAX_LOGS) {
                logs.pop();
            }
            await chrome.storage.local.set({ [PerformanceLogger.STORAGE_KEY]: logs });
            this.logger.debug('Performance log saved:', log);
        } catch (error) {
            this.logger.error('Error saving performance log:', error);
        }
    }

    private calculateSummary(metrics: { name: string; duration: number }[]): PerformanceLog['summary'] {
        if (metrics.length === 0) {
            return {
                totalDuration: 0,
                averageDuration: 0,
                slowestOperation: '',
                fastestOperation: ''
            };
        }

        const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
        const sortedMetrics = [...metrics].sort((a, b) => b.duration - a.duration);

        return {
            totalDuration,
            averageDuration: totalDuration / metrics.length,
            slowestOperation: sortedMetrics[0].name,
            fastestOperation: sortedMetrics[sortedMetrics.length - 1].name
        };
    }

    public async getLogs(): Promise<PerformanceLog[]> {
        try {
            const result = await chrome.storage.local.get(PerformanceLogger.STORAGE_KEY);
            return result[PerformanceLogger.STORAGE_KEY] || [];
        } catch (error) {
            this.logger.error('Error retrieving performance logs:', error);
            return [];
        }
    }

    public async getPerformanceAnalysis(): Promise<{
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
    }> {
        const logs = await this.getLogs();
        if (logs.length < 2) {
            return {
                trends: [],
                hotspots: [],
                recommendations: ['Not enough data for analysis']
            };
        }

        // Group metrics by operation name
        const operationMetrics: Record<string, number[]> = {};
        logs.forEach(log => {
            log.metrics.forEach(metric => {
                if (!operationMetrics[metric.name]) {
                    operationMetrics[metric.name] = [];
                }
                operationMetrics[metric.name].push(metric.duration);
            });
        });

        // Calculate trends
        const trends = Object.entries(operationMetrics).map(([operation, durations]) => {
            const recent = durations.slice(0, Math.floor(durations.length / 2));
            const older = durations.slice(Math.floor(durations.length / 2));
            
            const recentAvg = this.calculateAverage(recent);
            const olderAvg = this.calculateAverage(older);
            const percentageChange = ((recentAvg - olderAvg) / olderAvg) * 100;

            return {
                operation,
                averageDuration: recentAvg,
                trend: this.calculateTrend(percentageChange),
                percentageChange
            };
        });

        // Identify hotspots
        const hotspots = Object.entries(operationMetrics)
            .map(([operation, durations]) => ({
                operation,
                frequency: durations.length,
                averageDuration: this.calculateAverage(durations)
            }))
            .filter(h => h.averageDuration > 100 || h.frequency > logs.length * 0.5)
            .sort((a, b) => b.averageDuration * b.frequency - a.averageDuration * a.frequency);

        // Generate recommendations
        const recommendations = this.generateRecommendations(trends, hotspots);

        return { trends, hotspots, recommendations };
    }

    private calculateAverage(numbers: number[]): number {
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }

    private calculateTrend(value: number): Trend {
        if (value < -5) return 'improving';
        if (value > 5) return 'degrading';
        return 'stable';
    }

    private generateRecommendations(
        trends: { operation: string; trend: string; percentageChange: number }[],
        hotspots: { operation: string; frequency: number; averageDuration: number }[]
    ): string[] {
        const recommendations: string[] = [];

        // Check for degrading performance
        const degradingOps = trends.filter(t => t.trend === 'degrading');
        if (degradingOps.length > 0) {
            recommendations.push(
                `Performance degradation detected in: ${degradingOps
                    .map(op => `${op.operation} (${op.percentageChange.toFixed(1)}% slower)`)
                    .join(', ')}`
            );
        }

        // Check for frequent slow operations
        hotspots.forEach(hotspot => {
            if (hotspot.averageDuration > 200) {
                recommendations.push(
                    `Consider optimizing ${hotspot.operation} (avg: ${hotspot.averageDuration.toFixed(1)}ms, ` +
                    `called ${hotspot.frequency} times)`
                );
            }
        });

        // Add general recommendations
        if (hotspots.length > 3) {
            recommendations.push('Consider reducing the number of expensive operations running in parallel');
        }

        if (recommendations.length === 0) {
            recommendations.push('Performance is within acceptable ranges');
        }

        return recommendations;
    }

    public async clearLogs(): Promise<void> {
        try {
            await chrome.storage.local.remove(PerformanceLogger.STORAGE_KEY);
            this.logger.info('Performance logs cleared');
        } catch (error) {
            this.logger.error('Error clearing performance logs:', error);
        }
    }
}