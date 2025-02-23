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

            chrome.tabs.sendMessage(tabs[0].id, { action: "getGrades" }, (response) => {
                if (chrome.runtime.lastError) {
                    this.showNoAssignments('Error communicating with page');
                    return;
                }

                if (!response || !response.success) {
                    // Check if we're on the main Canvas page
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        const url = tabs[0]?.url;
                        if (url && url.endsWith('.instructure.com/')) {
                            this.showNoAssignments('Please navigate to a course grades page');
                        } else {
                            this.showNoAssignments('No grades found');
                        }
                    });
                    return;
                }

                if (!response.grades || !response.grades.assignments) {
                    this.showNoAssignments('No assignments found');
                    return;
                }

                this.assignments = response.grades.assignments.map((assignment: GradeData['assignments'][0]) => ({
                    title: assignment.name,
                    course: response.grades.courseName,
                    dueDate: new Date(), // Since grade data doesn't include due dates
                    priorityScore: 0, // Calculate this based on grade data
                    completed: false,
                    type: 'assignment',
                    points: assignment.points,
                    maxPoints: assignment.pointsPossible
                }));
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
