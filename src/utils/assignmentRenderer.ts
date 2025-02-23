import { Assignment } from '../types/models';
import { logger } from './logger';

export class AssignmentRenderer {
    private static formatDueDate(dueDate: Date): string {
        const now = new Date();
        const diff = dueDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return 'Past due';
        if (days === 0) return 'Due today';
        if (days === 1) return 'Due tomorrow';
        return `Due in ${days} days`;
    }

    private static getPriorityClass(priority: number): string {
        if (priority >= 0.8) return 'high-priority';
        if (priority >= 0.5) return 'medium-priority';
        return 'low-priority';
    }

    public static renderAssignment(assignment: Assignment): HTMLElement {
        const container = document.createElement('div');
        container.className = `assignment-item ${this.getPriorityClass(assignment.priority)}`;
        if (assignment.completed) {
            container.classList.add('completed');
        }

        const header = document.createElement('div');
        header.className = 'assignment-header';
        header.innerHTML = `
            <h3>${assignment.title}</h3>
            <span class="course-name">${assignment.courseName}</span>
        `;

        const details = document.createElement('div');
        details.className = 'assignment-details';
        details.innerHTML = `
            <span class="due-date">${this.formatDueDate(assignment.dueDate)}</span>
            ${assignment.gradeWeight ? `<span class="grade-weight">${assignment.gradeWeight}% of grade</span>` : ''}
            <span class="priority-score">${Math.round(assignment.priority * 100)}</span>
        `;

        if (assignment.description) {
            const description = document.createElement('div');
            description.className = 'assignment-description';
            description.textContent = assignment.description;
            container.appendChild(description);
        }

        container.appendChild(header);
        container.appendChild(details);

        return container;
    }

    public static renderAssignmentList(assignments: Assignment[]): HTMLElement {
        const container = document.createElement('div');
        container.className = 'assignments-list';

        if (assignments.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'no-assignments';
            emptyMessage.textContent = 'No assignments found';
            container.appendChild(emptyMessage);
            return container;
        }

        assignments.forEach(assignment => {
            try {
                const element = this.renderAssignment(assignment);
                container.appendChild(element);
            } catch (error) {
                logger.error('Error rendering assignment:', error);
            }
        });

        return container;
    }
}