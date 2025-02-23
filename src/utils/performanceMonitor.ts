import { logger } from './logger';
import { PerformanceMetric } from '../types/models';

export class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private enabled: boolean = false;

    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
    }

    public startMetric(name: string, metadata?: Record<string, any>): void {
        if (!this.enabled) return;

        this.metrics.set(name, {
            name,
            startTime: performance.now(),
            duration: 0,
            metadata
        });
    }

    public endMetric(name: string, additionalMetadata?: Record<string, any>): void {
        if (!this.enabled) return;

        const metric = this.metrics.get(name);
        if (!metric) {
            logger.warn(`No metric found with name: ${name}`);
            return;
        }

        const endTime = performance.now();
        metric.endTime = endTime;
        metric.duration = endTime - metric.startTime;
        
        if (additionalMetadata) {
            metric.metadata = {
                ...(metric.metadata || {}),
                ...additionalMetadata
            };
        }

        logger.debug(`Performance metric - ${name}:`, {
            duration: `${metric.duration.toFixed(2)}ms`,
            metadata: metric.metadata
        });
    }

    public getMetric(name: string): PerformanceMetric | undefined {
        return this.metrics.get(name);
    }

    public getAllMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    public clearMetrics(): void {
        this.metrics.clear();
    }

    public async measureAsync<T>(
        name: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        if (!this.enabled) {
            return fn();
        }

        this.startMetric(name, metadata);
        try {
            const result = await fn();
            this.endMetric(name);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.endMetric(name, { error: errorMessage });
            throw error;
        }
    }

    public measure<T>(
        name: string,
        fn: () => T,
        metadata?: Record<string, any>
    ): T {
        if (!this.enabled) {
            return fn();
        }

        this.startMetric(name, metadata);
        try {
            const result = fn();
            this.endMetric(name);
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.endMetric(name, { error: errorMessage });
            throw error;
        }
    }
}