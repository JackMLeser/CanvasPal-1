import { Assignment } from '../types/models';
import { Logger } from './logger';
import { PerformanceMonitor } from './performanceMonitor';

export class DebugPanel {
    private panel: HTMLElement | null = null;
    private logger: Logger;
    private performanceMonitor: PerformanceMonitor;
    private isVisible: boolean = false;
    private debugManager: { isDebugEnabled(): boolean };

    constructor(debugManager: { isDebugEnabled(): boolean }) {
        this.logger = new Logger('DebugPanel');
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.debugManager = debugManager;
        this.initializeKeyboardShortcut();
    }

    private createPanel(): void {
        const initPanel = () => {
            if (!document.body) {
                // Wait for body to be available
                requestAnimationFrame(initPanel);
                return;
            }

            this.panel = document.createElement('div');
            this.panel.id = 'canvaspal-debug-panel';
            this.panel.innerHTML = `
                <div class="debug-panel-header">
                    <span>🔍 CanvasPal Debug</span>
                    <div class="debug-panel-controls">
                        <button id="clear-metrics" title="Clear Performance Metrics">🗑️</button>
                        <button id="canvaspal-debug-close">✕</button>
                    </div>
                </div>
                <div class="debug-panel-content">
                    <div id="performance-metrics"></div>
                    <div id="assignment-info"></div>
                </div>
            `;

            // Apply styles
            this.panel.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                overflow-y: auto;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                display: none;
            `;

            // Add button styles
            const style = document.createElement('style');
            style.textContent = `
                .debug-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                .debug-panel-controls {
                    display: flex;
                    gap: 8px;
                }

                .debug-panel-controls button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .debug-panel-controls button:hover {
                    background: rgba(255,255,255,0.1);
                }

                .performance-section {
                    margin: 10px 0;
                    padding: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                }

                .metric-item {
                    margin: 4px 0;
                    display: flex;
                    justify-content: space-between;
                }

                .metric-value {
                    color: #90EE90;
                }

                .slow-metric {
                    color: #ff6b6b;
                }

                .normal-metric {
                    color: #ffd700;
                }

                .fast-metric {
                    color: #90EE90;
                }
            `;

            // Wait for head to be available
            if (document.head) {
                document.head.appendChild(style);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.head.appendChild(style);
                });
            }

            document.body.appendChild(this.panel);

            // Add event listeners
            document.getElementById('canvaspal-debug-close')?.addEventListener('click', () => {
                this.toggleVisibility();
            });

            document.getElementById('clear-metrics')?.addEventListener('click', () => {
                this.performanceMonitor.clear();
                this.updatePerformanceMetrics();
            });
        };

        // Start the initialization process
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPanel);
        } else {
            initPanel();
        }
    }

    private initializeKeyboardShortcut(): void {
        document.addEventListener('keydown', (e) => {
            // Only respond to shortcuts if debug mode is enabled
            if (this.debugManager.isDebugEnabled() && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }

    public toggleVisibility(): void {
        // Only allow showing the panel if debug mode is enabled
        if (this.isVisible || this.debugManager.isDebugEnabled()) {
            // Create panel if it doesn't exist and we're showing it
            if (!this.panel && !this.isVisible) {
                this.createPanel();
            }
            
            if (this.panel) {
                this.isVisible = !this.isVisible;
                this.panel.style.display = this.isVisible ? 'block' : 'none';
                
                // Remove panel from DOM when hiding it
                if (!this.isVisible && this.panel.parentNode) {
                    this.panel.parentNode.removeChild(this.panel);
                    this.panel = null;
                }
                
                this.logger.debug(`Debug panel ${this.isVisible ? 'shown' : 'hidden'}`);
            }
        }
    }

    private updatePerformanceMetrics(): void {
        const metricsContainer = document.getElementById('performance-metrics');
        if (!metricsContainer) return;

        const report = this.performanceMonitor.getReport();
        
        metricsContainer.innerHTML = `
            <div class="performance-section">
                <h3>Performance Summary</h3>
                <div class="metric-item">
                    <span>Total Duration:</span>
                    <span class="metric-value">${report.summary.totalDuration.toFixed(2)}ms</span>
                </div>
                <div class="metric-item">
                    <span>Average Duration:</span>
                    <span class="metric-value">${report.summary.averageDuration.toFixed(2)}ms</span>
                </div>
                <div class="metric-item">
                    <span>Slowest Operation:</span>
                    <span class="slow-metric">${report.summary.slowestOperation.name} (${report.summary.slowestOperation.duration.toFixed(2)}ms)</span>
                </div>
                <div class="metric-item">
                    <span>Fastest Operation:</span>
                    <span class="fast-metric">${report.summary.fastestOperation.name} (${report.summary.fastestOperation.duration.toFixed(2)}ms)</span>
                </div>
            </div>
            <div class="performance-section">
                <h3>Recent Operations</h3>
                ${report.metrics.slice(-5).map(metric => `
                    <div class="metric-item">
                        <span>${metric.name}</span>
                        <span class="${this.getMetricSpeedClass(metric.duration || 0)}">${metric.duration?.toFixed(2)}ms</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    private getMetricSpeedClass(duration: number): string {
        if (duration > 100) return 'slow-metric';
        if (duration > 50) return 'normal-metric';
        return 'fast-metric';
    }

    public updateAssignmentInfo(assignments: Assignment[]): void {
        const container = document.getElementById('assignment-info');
        if (!container) return;

        const typeCounts = this.getAssignmentTypeCounts(assignments);
        const priorityRanges = this.getPriorityRanges(assignments);

        container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="color: #0066cc; margin-bottom: 8px;">
                    Found ${assignments.length} assignments
                </div>
                ${this.renderTypeCounts(typeCounts)}
                ${this.renderPriorityDistribution(priorityRanges)}
            </div>
            ${this.renderAssignmentList(assignments)}
        `;

        // Update performance metrics
        this.updatePerformanceMetrics();
    }

    private getAssignmentTypeCounts(assignments: Assignment[]): Record<string, number> {
        return assignments.reduce((acc, assignment) => {
            acc[assignment.type] = (acc[assignment.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private getPriorityRanges(assignments: Assignment[]): Record<string, number> {
        return assignments.reduce((acc, assignment) => {
            if (assignment.priorityScore >= 0.7) acc.high = (acc.high || 0) + 1;
            else if (assignment.priorityScore >= 0.4) acc.medium = (acc.medium || 0) + 1;
            else acc.low = (acc.low || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private renderTypeCounts(counts: Record<string, number>): string {
        return `
            <div style="margin-bottom: 10px;">
                <div style="color: #ffd700; margin-bottom: 5px;">Assignment Types:</div>
                ${Object.entries(counts).map(([type, count]) => `
                    <div style="margin-left: 10px; color: #90EE90;">
                        ${type}: ${count}
                    </div>
                `).join('')}
            </div>
        `;
    }

    private renderPriorityDistribution(ranges: Record<string, number>): string {
        const colors = {
            high: '#ff6b6b',
            medium: '#ffd700',
            low: '#90EE90'
        };

        return `
            <div style="margin-bottom: 10px;">
                <div style="color: #ffd700; margin-bottom: 5px;">Priority Distribution:</div>
                ${Object.entries(ranges).map(([range, count]) => `
                    <div style="margin-left: 10px; color: ${colors[range as keyof typeof colors]};">
                        ${range}: ${count}
                    </div>
                `).join('')}
            </div>
        `;
    }

    private renderAssignmentList(assignments: Assignment[]): string {
        return `
            <div style="margin-top: 15px;">
                <div style="color: #ffd700; margin-bottom: 5px;">Detailed Assignments:</div>
                ${assignments.map(assignment => this.renderAssignmentDetail(assignment)).join('')}
            </div>
        `;
    }

    private renderAssignmentDetail(assignment: Assignment): string {
        const priorityColor = assignment.priorityScore >= 0.7 ? '#ff6b6b' :
                            assignment.priorityScore >= 0.4 ? '#ffd700' : '#90EE90';

        return `
            <div style="margin: 8px 0; padding: 8px; border-left: 2px solid ${priorityColor}; background: rgba(255,255,255,0.1);">
                <div style="margin-bottom: 4px;">📚 ${assignment.title}</div>
                <div style="color: #90EE90; margin-bottom: 4px;">
                    ${assignment.points ? `📝 ${assignment.points}/${assignment.maxPoints} points` : 'No points data'}
                </div>
                <div style="color: #ADD8E6; font-size: 11px;">
                    ⏰ Due: ${this.formatDate(assignment.dueDate)}
                </div>
                <div style="color: #DDA0DD; font-size: 11px;">
                    📚 Course: ${assignment.course}
                </div>
                <div style="color: ${priorityColor}; font-size: 11px; margin-top: 4px;">
                    ⚡ Priority: ${Math.round(assignment.priorityScore * 100)}%
                </div>
            </div>
        `;
    }

    public logDetectionEvent(message: string, data?: any): void {
        this.logger.debug(message, data);
        // Could add visual indication of new events in the panel
    }

    private formatDate(date: string): string {
        // Handle special date strings
        if (date === 'All Day' || date === 'No due date') {
            return date;
        }

        // Extract date from "Due: " format if present
        const dateStr = date.startsWith('Due: ') ? date.substring(5) : date;
        
        try {
            const dateObj = new Date(dateStr);
            // Check if date parsing was successful
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
            // Return original string if parsing fails
            return date;
        } catch {
            // Return original string if parsing fails
            return date;
        }
    }

    public updatePerformanceAnalysis(analysis: any): void {
        // Implementation
    }
}