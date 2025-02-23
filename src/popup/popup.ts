import { Assignment } from '../types/models';

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

            chrome.tabs.sendMessage(tabs[0].id, { action: "getAssignments" }, (response) => {
                if (chrome.runtime.lastError) {
                    this.showNoAssignments('Error communicating with page');
                    return;
                }

                if (!response || !response.assignments || response.assignments.length === 0) {
                    this.showNoAssignments('No assignments found');
                    return;
                }

                this.assignments = response.assignments;
                this.renderAssignments();
            });

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
