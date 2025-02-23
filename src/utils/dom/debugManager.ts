import { logger } from '../logger';
import { DateMatch, DebugInfo, PerformanceMetric, PerformanceAnalysis } from '../../types/models';
import { PerformanceMonitor } from '../performanceMonitor';
import { PerformanceLogger } from './performanceLogger';

export class DebugManager {
    private enabled: boolean = false;
    private debugElements: Map<HTMLElement, DebugInfo> = new Map();
    private performanceMonitor: PerformanceMonitor;
    private performanceLogger: PerformanceLogger;

    constructor() {
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceLogger = new PerformanceLogger(this.performanceMonitor);
        this.initializeStyles();
    }

    public updateDebugConfig(config: {
        enabled?: boolean;
        logLevel?: 'debug' | 'info' | 'warn' | 'error';
        showDateDebug?: boolean;
        showAssignmentDebug?: boolean;
        showPriorityDebug?: boolean;
    }): void {
        if (config.enabled !== undefined) {
            this.enabled = config.enabled;
            if (config.enabled) {
                logger.enable();
                this.showDebugElements();
                this.performanceMonitor.enable();
                this.performanceLogger.enable();
            } else {
                logger.disable();
                this.hideDebugElements();
                this.performanceMonitor.disable();
                this.performanceLogger.disable();
            }
        }

        if (config.logLevel) {
            logger.setLogLevel(config.logLevel);
        }
    }

    private initializeStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .debug-highlight {
                background-color: rgba(255, 255, 0, 0.3);
                border: 1px solid #ffd700;
            }
            .debug-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                z-index: 9999;
                max-width: 400px;
                max-height: 300px;
                overflow: auto;
            }
            .debug-info {
                margin: 5px 0;
                padding: 5px;
                border-left: 3px solid #ffd700;
            }
            .debug-match {
                color: #90ee90;
            }
            .debug-confidence {
                color: #ff69b4;
            }
        `;
        document.head.appendChild(style);
    }

    public addDebugInfo(element: HTMLElement, info: DebugInfo): void {
        this.debugElements.set(element, info);
        if (this.enabled) {
            this.highlightElement(element);
            this.showDebugInfo(element, info);
        }
    }

    public removeDebugInfo(element: HTMLElement): void {
        this.debugElements.delete(element);
        element.classList.remove('debug-highlight');
        const panel = element.querySelector('.debug-panel');
        if (panel) {
            panel.remove();
        }
    }

    private highlightElement(element: HTMLElement): void {
        element.classList.add('debug-highlight');
    }

    private showDebugInfo(element: HTMLElement, info: DebugInfo): void {
        const panel = document.createElement('div');
        panel.className = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-info">
                <div>Confidence: <span class="debug-confidence">${info.confidence.toFixed(2)}</span></div>
                <div>Patterns: ${info.patterns.map(p => `<div class="debug-match">${p}</div>`).join('')}</div>
                <div>Matches: ${info.matchedText.map(m => `<div class="debug-match">${m}</div>`).join('')}</div>
            </div>
        `;
        element.appendChild(panel);
    }

    private showDebugElements(): void {
        this.debugElements.forEach((info, element) => {
            this.highlightElement(element);
            this.showDebugInfo(element, info);
        });
    }

    private hideDebugElements(): void {
        this.debugElements.forEach((_, element) => {
            element.classList.remove('debug-highlight');
            const panel = element.querySelector('.debug-panel');
            if (panel) {
                panel.remove();
            }
        });
    }

    public clearDebugInfo(): void {
        this.debugElements.clear();
        document.querySelectorAll('.debug-highlight, .debug-panel').forEach(el => el.remove());
    }

    public startPerformanceMetric(name: string, metadata?: Record<string, any>): void {
        this.performanceMonitor.startMetric(name, metadata);
    }

    public endPerformanceMetric(name: string): void {
        this.performanceMonitor.endMetric(name);
    }

    public getPerformanceMetrics(): PerformanceMetric[] {
        return this.performanceMonitor.getAllMetrics();
    }

    public getPerformanceAnalysis(): PerformanceAnalysis[] {
        return this.performanceLogger.getAnalysis();
    }
} 