import { DebugPanel } from './debugPanel';
import { DateDebugPanel } from './dateDebugPanel';
interface DebugConfig {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    showDateDebug: boolean;
    showAssignmentDebug: boolean;
    showPriorityDebug: boolean;
    showPerformanceMetrics: boolean;
}
export declare class DebugManager {
    private logger;
    private mainPanel;
    private datePanel;
    private performanceMonitor;
    private performanceLogger;
    private config;
    constructor();
    private initializePerformanceLogging;
    private updatePerformanceAnalysis;
    private initializeKeyboardShortcuts;
    private togglePerformanceMetrics;
    private loadDebugConfig;
    private saveDebugConfig;
    private applyConfig;
    private disableAllPanels;
    toggleDebugMode(): void;
    updateDebugConfig(newConfig: Partial<DebugConfig>): void;
    private getLogLevel;
    getMainPanel(): DebugPanel;
    getDatePanel(): DateDebugPanel;
    isDebugEnabled(): boolean;
    getConfig(): DebugConfig;
    clearPerformanceLogs(): Promise<void>;
    getPerformanceAnalysis(): Promise<{
        trends: {
            operation: string;
            averageDuration: number;
            trend: "improving" | "degrading" | "stable";
            percentageChange: number;
        }[];
        hotspots: {
            operation: string;
            frequency: number;
            averageDuration: number;
        }[];
        recommendations: string[];
    }>;
}
export {};
