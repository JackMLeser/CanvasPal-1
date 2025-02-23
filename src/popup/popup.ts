import { Assignment, GradeData } from '../types/models';

interface GradeResponse {
    success: boolean;
    grades: GradeData | null;
}

interface Settings {
    showOutsideCanvas: boolean;
    refreshInterval: number;
}

class PopupManager {
    private assignments: Assignment[] = [];
    private popupContainer: HTMLElement | null;
    private assignmentsButton: HTMLElement | null;
    private settingsContent: HTMLElement | null;
    private settings: Settings = {
        showOutsideCanvas: true,
        refreshInterval: 60
    };

    constructor() {
        this.popupContainer = document.getElementById('popupContainer');
        this.assignmentsButton = document.getElementById('assignmentsButton');
        this.settingsContent = document.getElementById('settingsContent');
        this.initializeEventListeners();
        this.loadSettings();
        this.loadAssignments();
    }

    private initializeEventListeners(): void {
        // Toggle popup
        this.assignmentsButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup();
        });

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!this.popupContainer?.contains(target) && 
                !this.assignmentsButton?.contains(target)) {
                this.closePopup();
            }
        });

        // Settings panel toggle
        document.getElementById('openSettings')?.addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('backButton')?.addEventListener('click', () => {
            this.hideSettings();
        });

        // Settings controls
        document.getElementById('showOutsideCanvas')?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            this.settings.showOutsideCanvas = target.checked;
            this.saveSettings();
        });

        document.getElementById('refreshInterval')?.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.settings.refreshInterval = parseInt(target.value);
            this.saveSettings();
        });
    }

    private togglePopup(): void {
        this.popupContainer?.classList.toggle('show');
        if (this.popupContainer?.classList.contains('show')) {
            this.loadAssignments();
        }
    }

    private closePopup(): void {
        this.popupContainer?.classList.remove('show');
        this.hideSettings();
    }

    private showSettings(): void {
        this.settingsContent?.classList.add('show');
    }

    private hideSettings(): void {
        this.settingsContent?.classList.remove('show');
    }

    private async loadSettings(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(['settings']);
            if (result.settings) {
                this.settings = result.settings;
                // Update UI
                const showOutsideCanvas = document.getElementById('showOutsideCanvas') as HTMLInputElement;
                const refreshInterval = document.getElementById('refreshInterval') as HTMLSelectElement;
                if (showOutsideCanvas) showOutsideCanvas.checked = this.settings.showOutsideCanvas;
                if (refreshInterval) refreshInterval.value = this.settings.refreshInterval.toString();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    private async saveSettings(): Promise<void> {
        try {
            await chrome.storage.local.set({ settings: this.settings });
            // Update button visibility if not on Canvas
            if (!window.location.href.includes('.instructure.com')) {
                this.assignmentsButton!.style.display = 
                    this.settings.showOutsideCanvas ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
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
                const url = tabs[0]?.url;
                if (url?.includes('.instructure.com')) {
                    if (url.includes('/grades')) {
                        this.showNoAssignments('Loading grades...');
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
            this.updateAssignmentCount();
            this.renderAssignments();

        } catch (error) {
            this.showNoAssignments('Failed to load assignments');
        }
    }

    private updateAssignmentCount(): void {
        if (this.assignmentsButton) {
            this.assignmentsButton.textContent = this.assignments.length.toString();
            this.assignmentsButton.classList.toggle('has-assignments', this.assignments.length > 0);
        }

        const taskCount = document.getElementById('taskCount');
        if (taskCount) {
            taskCount.textContent = `${this.assignments.length} Task${this.assignments.length !== 1 ? 's' : ''}`;
        }
    }

    private renderAssignments(): void {
        const assignmentList = document.getElementById('assignmentList');
        if (!assignmentList) return;

        if (this.assignments.length === 0) {
            this.showNoAssignments('No assignments found');
            return;
        }

        assignmentList.innerHTML = this.assignments
            .map(assignment => this.createAssignmentElement(assignment))
            .join('');
    }

    private createAssignmentElement(assignment: Assignment): string {
        const priorityClass = this.getPriorityClass(assignment.priorityScore);
        const dueDate = this.formatDate(assignment.dueDate);
        const timeStatus = this.getTimeStatus(dueDate);

        return `
            <div class="assignment-card ${priorityClass}">
                <div class="assignment-title">
                    <a href="${assignment.url || '#'}" target="_blank">
                        ${assignment.title}
                    </a>
                </div>
                <div class="assignment-course">${assignment.course}</div>
                <div class="due-info">
                    <span class="due-date">Due: ${dueDate}</span>
                    <span class="time-remaining ${timeStatus.class}">${timeStatus.text}</span>
                </div>
                <div class="points">${assignment.points} points</div>
            </div>
        `;
    }

    private getPriorityClass(priorityScore: number): string {
        if (priorityScore > 0.7) return 'high-priority';
        if (priorityScore > 0.4) return 'medium-priority';
        return 'low-priority';
    }

    private formatDate(date: string): string {
        if (date === 'All Day' || date === 'No due date') {
            return date;
        }

        const dateStr = date.startsWith('Due: ') ? date.substring(5) : date;
        
        try {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                });
            }
            return date;
        } catch {
            return date;
        }
    }

    private getTimeStatus(dueDate: string): { text: string; class: string } {
        if (dueDate === 'No due date') {
            return { text: 'No due date', class: '' };
        }

        try {
            const due = new Date(dueDate);
            const now = new Date();
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) return { text: 'Past due!', class: 'urgent' };
            if (diffDays === 0) return { text: 'Due today!', class: 'urgent' };
            if (diffDays === 1) return { text: 'Due tomorrow!', class: 'urgent' };
            if (diffDays <= 3) return { text: `Due in ${diffDays} days`, class: 'soon' };
            return { text: `${diffDays} days left`, class: '' };
        } catch {
            return { text: 'Invalid date', class: '' };
        }
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
