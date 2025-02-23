import { Assignment, GradeData } from '../types/models';

interface GradeResponse {
    success: boolean;
    grades: GradeData | null;
}

class PopupManager {
    private assignments: Assignment[] = [];

    constructor() {
        this.initializeEventListeners();
        this.loadAssignments();
    }

    private initializeEventListeners(): void {
        document.getElementById('openSettings')?.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            }
        });
    }

    private async loadAssignments(): Promise<void> {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]?.id) {
                this.showNoAssignments('No active tab found');
                return;
            }

            // Get assignments from background script
            const response = await chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' });
            
            if (!response || !response.assignments) {
                // Check if we're on a Canvas page
                const url = tabs[0]?.url;
                if (url?.includes('.instructure.com')) {
                    if (url.includes('/grades')) {
                        this.showNoAssignments('Loading grades...');
                        // Trigger a refresh
                        await chrome.runtime.sendMessage({ type: 'REFRESH_ASSIGNMENTS' });
                    } else {
                        this.showNoAssignments('Please navigate to a course grades page');
                    }
                } else {
                    this.showNoAssignments('Please navigate to Canvas');
                }
                return;
            }

            this.assignments = response.assignments;
            this.renderAssignments();

        } catch (error) {
            this.showNoAssignments('Failed to load assignments');
        }
    }

    private renderAssignments(): void {
        const assignmentList = document.getElementById('assignmentList');
        if (!assignmentList) return;

        assignmentList.innerHTML = this.assignments
            .map(assignment => this.createAssignmentElement(assignment))
            .join('');
    }

    private createAssignmentElement(assignment: Assignment): string {
        const priorityClass = this.getPriorityClass(assignment.priorityScore);
        return `
            <div class="assignment-item ${priorityClass}">
                <div class="assignment-title">${assignment.title}</div>
                <div class="assignment-course">${assignment.course}</div>
                <div class="assignment-due-date">Due: ${this.formatDate(assignment.dueDate)}</div>
            </div>
        `;
    }

    private getPriorityClass(priorityScore: number): string {
        if (priorityScore > 0.7) return 'high-priority';
        if (priorityScore > 0.4) return 'medium-priority';
        return 'low-priority';
    }

    private formatDate(date: Date): string {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    private showNoAssignments(message: string): void {
        const assignmentList = document.getElementById('assignmentList');
        if (assignmentList) {
            assignmentList.innerHTML = `
                <div class="no-assignments">
                    ${message}
                </div>
            `;
        }
    }
}

// Initialize popup
window.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
