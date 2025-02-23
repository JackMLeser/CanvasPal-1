import { Assignment } from '../types/models';
import { Logger } from '../utils/logger';

export class AssignmentRenderer {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('AssignmentRenderer');
    }

    public renderAssignment(assignment: Assignment): HTMLElement {
        const assignmentElement = document.createElement('div');
        assignmentElement.className = this.getAssignmentClasses(assignment);
        assignmentElement.dataset.id = assignment.id;

        assignmentElement.innerHTML = `
            <div class="course-name">${this.escapeHtml(assignment.course)}</div>
            <div class="assignment-header">
                <span class="assignment-type type-${assignment.type}">${this.capitalizeFirstLetter(assignment.type)}</span>
                <span class="priority-score">${Math.round(assignment.priorityScore * 100)}%</span>
            </div>
            <div class="assignment-title">${this.escapeHtml(assignment.title)}</div>
            <div class="assignment-details">
                <div class="detail-item">
                    <span class="detail-icon">⏰</span>
                    <span>${this.formatDueDate(assignment.dueDate)}</span>
                </div>
                ${this.renderPointsDisplay(assignment)}
                ${assignment.details ? this.renderAdditionalDetails(assignment.details) : ''}
            </div>
            ${this.renderPriorityDetails(assignment)}
            <div class="completion">
                <input type="checkbox"
                    ${assignment.completed ? 'checked' : ''}
                    title="Mark as complete"
                    onclick="handleCompletionToggle('${assignment.id}', this.checked)">
            </div>
        `;

        return assignmentElement;
    }

    private getAssignmentClasses(assignment: Assignment): string {
        const classes = ['assignment-item'];
        
        // Add priority class
        if (assignment.priorityScore >= 0.7) {
            classes.push('high-priority');
        } else if (assignment.priorityScore >= 0.4) {
            classes.push('medium-priority');
        } else {
            classes.push('low-priority');
        }

        return classes.join(' ');
    }

    private formatDueDate(date: string): string {
        // Handle special date strings
        if (date === 'All Day') {
            return 'Due today (All Day)';
        }
        if (date === 'No due date') {
            return 'No due date';
        }

        // Extract date from "Due: " format if present
        const dateStr = date.startsWith('Due: ') ? date.substring(5) : date;
        
        try {
            const dueDateObj = new Date(dateStr);
            // Check if date parsing was successful
            if (!isNaN(dueDateObj.getTime())) {
                const now = new Date();
                const diffDays = Math.ceil((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
                } else if (diffDays === 0) {
                    return 'Due today';
                } else if (diffDays === 1) {
                    return 'Due tomorrow';
                } else {
                    return `Due in ${diffDays} days`;
                }
            }
            // Return original string if parsing fails
            return date;
        } catch {
            // Return original string if parsing fails
            return date;
        }
    }

    private renderPointsDisplay(assignment: Assignment): string {
        if (!assignment.points && !assignment.maxPoints) return '';

        return `
            <div class="detail-item">
                <span class="detail-icon">📊</span>
                <span class="points-display">
                    ${assignment.points || 0} / ${assignment.maxPoints || 0} points
                    ${assignment.gradeWeight ? ` (${Math.round(assignment.gradeWeight * 100)}% of grade)` : ''}
                </span>
            </div>
        `;
    }

    private renderAdditionalDetails(details: Assignment['details']): string {
        if (!details) return '';

        let detailsHtml = '';

        if (details.submissionType?.length) {
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">📝</span>
                    <span>Submit via: ${details.submissionType.join(', ')}</span>
                </div>
            `;
        }

        if (details.isLocked) {
            detailsHtml += `
                <div class="detail-item">
                    <span class="detail-icon">🔒</span>
                    <span>Locked</span>
                </div>
            `;
        }

        return detailsHtml;
    }

    private escapeHtml(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private renderPriorityDetails(assignment: Assignment): string {
        if (!assignment.priorityDetails) return '';

        const { dueStatus, pointsImpact, typeImportance } = assignment.priorityDetails;

        return `
            <div class="priority-details">
                <div class="priority-item">
                    <div class="priority-label">Due Status</div>
                    <div class="priority-value ${dueStatus}">
                        ${this.formatDueStatus(dueStatus)}
                    </div>
                </div>
                <div class="priority-item">
                    <div class="priority-label">Points Impact</div>
                    <div class="priority-value ${pointsImpact}">
                        ${this.formatPointsImpact(pointsImpact)}
                    </div>
                </div>
                <div class="priority-item">
                    <div class="priority-label">Type</div>
                    <div class="priority-value ${typeImportance}">
                        ${this.formatTypeImportance(typeImportance)}
                    </div>
                </div>
            </div>
        `;
    }

    private formatDueStatus(status: string): string {
        switch (status) {
            case 'overdue': return '⚠️ Overdue';
            case 'due-soon': return '⏰ Due Soon';
            case 'upcoming': return '📅 Upcoming';
            case 'far-future': return '🕒 Future';
            default: return status;
        }
    }

    private formatPointsImpact(impact: string): string {
        switch (impact) {
            case 'high': return '⭐⭐⭐ High';
            case 'medium': return '⭐⭐ Medium';
            case 'low': return '⭐ Low';
            default: return impact;
        }
    }

    private formatTypeImportance(importance: string): string {
        switch (importance) {
            case 'critical': return '🔥 Critical';
            case 'high': return '📊 High';
            case 'normal': return '📝 Normal';
            case 'low': return '📌 Low';
            default: return importance;
        }
    }
}