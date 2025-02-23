import { Assignment } from '../types/models';

export class NotificationManager {
    constructor() {
        this.checkUpcomingAssignments();
    }

    private async checkUpcomingAssignments(): Promise<void> {
        const { assignments } = await chrome.storage.local.get('assignments');
        const { settings } = await chrome.storage.sync.get('settings');

        if (!assignments || !settings) return;

        const now = new Date();
        assignments.forEach((assignment: Assignment) => {
            if (assignment.completed) return;

            // Handle special cases
            if (assignment.dueDate === 'All Day') {
                // Consider "All Day" assignments as due at end of current day
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                const timeUntilDue = endOfDay.getTime() - now.getTime();
                if (timeUntilDue <= settings.notifications.notifyBefore && timeUntilDue > 0) {
                    this.createNotification(assignment);
                }
                return;
            }
            if (assignment.dueDate === 'No due date') {
                return;
            }

            // Extract date from "Due: " format if present
            const dateStr = assignment.dueDate.startsWith('Due: ') ?
                assignment.dueDate.substring(5) : assignment.dueDate;

            try {
                const dueDateObj = new Date(dateStr);
                if (!isNaN(dueDateObj.getTime())) {
                    const timeUntilDue = dueDateObj.getTime() - now.getTime();
            if (timeUntilDue <= settings.notifications.notifyBefore &&
                timeUntilDue > 0 &&
                (!settings.notifications.onlyHighPriority || assignment.priorityScore >= 0.7)) {
                this.createNotification(assignment);
            }
        });
    }

    private createNotification(assignment: Assignment): void {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Assignment Due Soon',
            message: `${assignment.title} is due ${this.formatTimeRemaining(assignment.dueDate)}`,
            priority: 2
        });
    }

    private formatTimeRemaining(dueDate: string): string {
        // Handle special cases
        if (dueDate === 'All Day') {
            return 'today (All Day)';
        }
        if (dueDate === 'No due date') {
            return 'no set date';
        }

        // Extract date from "Due: " format if present
        const dateStr = dueDate.startsWith('Due: ') ? dueDate.substring(5) : dueDate;
        
        try {
            const dueDateObj = new Date(dateStr);
            if (!isNaN(dueDateObj.getTime())) {
                const hours = Math.ceil((dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60));
                return hours > 24 ? `in ${Math.floor(hours / 24)} days` : `in ${hours} hours`;
            }
            return dueDate; // Return original string if parsing fails
        } catch {
            return dueDate; // Return original string if parsing fails
        }
    }
}
