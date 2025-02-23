import type { CalendarEvent, PrioritySettings, GradeData, DashboardData, Assignment } from '../types/models';
import { parseICalFeed } from '../utils/calendar';
import { calculatePriority } from '../utils/priorities';
import { logger, LogLevel, Logger } from '../utils/logger';
import { BackgroundAssignmentDetector } from '../utils/backgroundAssignmentDetector';
import { BackgroundPriorityCalculator } from '../utils/backgroundPriorityCalculator';

import { Settings } from '../types/models';

interface ICalEvent extends CalendarEvent {
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}

class BackgroundService {
    private static readonly SYNC_INTERVAL = 30 * 60 * 1000;
    private static readonly RETRY_INTERVAL = 5 * 60 * 1000;
    private gradeData: { [courseId: string]: GradeData } = {};
    private dashboardData: { [courseId: string]: DashboardData } = {};
    private lastSyncTime = 0;
    private syncIntervalId?: number;
    private retryTimeoutId?: number;
    private settings: Settings;
    private assignments: Assignment[] = [];
    private detector: BackgroundAssignmentDetector;
    private priorityCalculator: BackgroundPriorityCalculator;
    private logger: Logger;
    private contentScriptReady = false;

    constructor() {
        this.settings = {
            priorityWeights: {
                GRADE_IMPACT: 0.4,
                COURSE_GRADE: 0.3,
                DUE_DATE: 0.3
            },
            typeWeights: {
                quiz: 1.2,
                assignment: 1.0,
                discussion: 0.8,
                announcement: 0.5
            },
            displayOptions: {
                showCourseNames: true,
                showGradeImpact: true,
                showPriorityScores: true,
                highlightOverdue: true
            },
            refreshInterval: 30,
            debugSettings: {
                enabled: false,
                logLevel: 'info',
                showDateDebug: false,
                showAssignmentDebug: false,
                showPriorityDebug: false
            },
            icalUrl: ''
        };
        this.detector = new BackgroundAssignmentDetector();
        this.priorityCalculator = new BackgroundPriorityCalculator();
        this.logger = new Logger('BackgroundService');
        this.initialize();
        this.setupAutoRefresh();
    }

    public async initialize(): Promise<void> {
        try {
            // Load settings from sync storage
            const { settings } = await chrome.storage.sync.get('settings');
            if (settings) {
                this.settings = settings;
            } else {
                // Initialize default settings if none exist
                await chrome.storage.sync.set({ settings: this.settings });
            }

            // Set up message listeners
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message, sender, sendResponse);
                return true; // Keep the message channel open for async response
            });

            this.startPeriodicSync();
            this.logger.info('Background service initialized');
        } catch (error) {
            this.logger.error('Error initializing background service:', error);
        }
    }

    private async handleMessage(
        message: any,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ): Promise<void> {
        try {
            switch (message.type) {
                case 'PING':
                    // Respond immediately to ping requests
                    sendResponse({ success: true });
                    break;

                case 'SETTINGS_UPDATED':
                    try {
                        await this.handleSettingsUpdate(message.settings);
                        sendResponse({ success: true });
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        console.error('Error handling settings update:', errorMessage);
                        sendResponse({ success: false, error: errorMessage });
                    }
                    break;

                case 'GET_ASSIGNMENTS':
                    try {
                        if (!this.contentScriptReady) {
                            sendResponse({ assignments: [], message: 'Loading assignments...' });
                            return;
                        }
                        const assignments = await this.getAssignments();
                        sendResponse({ assignments });
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        console.error('Error getting assignments:', errorMessage);
                        sendResponse({ success: false, error: errorMessage });
                    }
                    break;

                case 'UPDATE_ASSIGNMENT_COMPLETION':
                    await this.updateAssignmentCompletion(
                        message.assignmentId,
                        message.completed
                    );
                    sendResponse({ success: true });
                    break;

                case 'REFRESH_ASSIGNMENTS':
                    await this.refreshAssignments();
                    sendResponse({ success: true });
                    break;

                case 'GRADE_DATA':
                    this.handleGradeData(message.data);
                    sendResponse({ success: true });
                    break;

                case 'DASHBOARD_DATA':
                    this.handleDashboardData(message.data);
                    sendResponse({ success: true });
                    break;

                case 'CONTENT_SCRIPT_READY':
                    this.logger.info('Content script ready');
                    this.contentScriptReady = true;
                    sendResponse({ success: true });
                    // Wait a bit for the page to fully load before fetching assignments
                    setTimeout(() => {
                        void this.refreshAssignments();
                    }, 1000);
                    break;

                default:
                    this.logger.warn('Unknown message type:', message);
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            this.logger.error('Error handling message:', error);
            sendResponse({ error: 'Internal error' });
        }
    }

    private async handleSettingsUpdate(newSettings: Settings): Promise<void> {
        try {
            this.settings = newSettings;
            
            // Save to storage
            await chrome.storage.sync.set({ settings: newSettings });
            this.logger.info('Settings saved to sync storage');

            // Save to local storage for faster access
            await chrome.storage.local.set({ settings: newSettings });
            this.logger.info('Settings saved to local storage');

            // Notify all Canvas tabs
            const tabs = await chrome.tabs.query({
                url: [
                    "*://*.instructure.com/*",
                    "*://*.canvas.com/*"
                ]
            });

            // Send update to each tab with retry logic
            const updatePromises = tabs.map(async tab => {
                if (tab.id) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            type: 'SETTINGS_UPDATED',
                            settings: newSettings
                        });
                        this.logger.debug(`Settings updated in tab ${tab.id}`);
                    } catch (error) {
                        // If tab is not ready, queue update for retry
                        this.logger.debug(`Could not update tab ${tab.id}, will retry:`, error);
                        setTimeout(async () => {
                            try {
                                if (tab.id) {
                                    await chrome.tabs.sendMessage(tab.id, {
                                        type: 'SETTINGS_UPDATED',
                                        settings: newSettings
                                    });
                                    this.logger.debug(`Settings updated in tab ${tab.id} after retry`);
                                }
                            } catch (retryError) {
                                this.logger.debug(`Failed to update tab ${tab.id} after retry:`, retryError);
                            }
                        }, 2000); // Retry after 2 seconds
                    }
                }
            });

            await Promise.all(updatePromises);
            this.logger.info('Settings updated and propagated to all tabs');

            // Trigger a sync with new settings
            await this.performSync();
        } catch (error) {
            this.logger.error('Error in handleSettingsUpdate:', error);
            throw error;
        }
    }

    private async getAssignments(): Promise<Assignment[]> {
        if (this.assignments.length === 0) {
            await this.refreshAssignments();
        }
        return this.assignments;
    }

    public async refreshAssignments(): Promise<void> {
        if (!this.contentScriptReady) {
            this.logger.warn('Content script not ready, waiting for initialization');
            return;
        }

        try {
            // Find active Canvas tab
            const tabs = await chrome.tabs.query({
                active: true,
                url: ["*://*.instructure.com/*", "*://*.canvas.com/*"]
            });

            if (!tabs.length) {
                this.logger.warn('No active Canvas tab found');
                this.assignments = [];
                await this.saveAssignments();
                this.notifyPopups();
                return;
            }

            // Get assignments from detector
            const newAssignments = await this.detector.detectAssignments();

            // Calculate priorities for each assignment
            newAssignments.forEach((assignment: Assignment) => {
                assignment.priorityScore = this.priorityCalculator.calculatePriority(assignment);
            });

            // Sort by priority
            newAssignments.sort((a: Assignment, b: Assignment) => b.priorityScore - a.priorityScore);

            // Update stored assignments
            this.assignments = newAssignments;

            // Save to storage and notify popups
            await this.saveAssignments();
            this.notifyPopups();

            this.logger.info('Assignments refreshed:', {
                count: newAssignments.length,
                types: this.getAssignmentTypeCounts(newAssignments)
            });
        } catch (error) {
            this.logger.error('Error refreshing assignments:', error);
            this.assignments = [];
            await this.saveAssignments();
            this.notifyPopups();
            throw error;
        }
    }

    public async updateAssignmentCompletion(
        assignmentId: string,
        completed: boolean
    ): Promise<void> {
        const assignment = this.assignments.find(a => a.id === assignmentId);
        if (assignment) {
            assignment.completed = completed;
            await this.saveAssignments();
            this.notifyPopups();
        }
    }

    private async saveAssignments(): Promise<void> {
        try {
            await chrome.storage.local.set({ 
                assignments: this.assignments,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('Error saving assignments:', error);
            throw error;
        }
    }

    private notifyPopups(): void {
        const message = {
            type: 'ASSIGNMENTS_UPDATED',
            assignments: this.assignments,
            status: this.getAssignmentStatus()
        };

        // Send to popups
        chrome.runtime.sendMessage(message).catch(error => {
            // Ignore errors - popups might not be open
            this.logger.debug('No popups to notify:', error);
        });

        // Send to content scripts
        chrome.tabs.query({
            url: ["*://*.instructure.com/*", "*://*.canvas.com/*"]
        }).then(tabs => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, message).catch(error => {
                        this.logger.debug(`Could not notify tab ${tab.id}:`, error);
                    });
                }
            });
        });
    }

    private getAssignmentStatus(): string {
        if (!this.contentScriptReady) {
            return 'Loading assignments...';
        }
        if (this.assignments.length === 0) {
            return 'No assignments found';
        }
        return `Found ${this.assignments.length} assignments`;
    }

    private setupAutoRefresh(): void {
        // Refresh every 30 minutes
        chrome.alarms.create('refreshAssignments', { periodInMinutes: 30 });
        
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === 'refreshAssignments') {
                await this.refreshAssignments();
            }
        });
    }

    private getAssignmentTypeCounts(assignments: Assignment[]): Record<string, number> {
        return assignments.reduce((counts, assignment) => {
            counts[assignment.type] = (counts[assignment.type] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    }

    private handleGradeData(data: GradeData): void {
        try {
            this.logger.info('Received grade data:', data);
            this.gradeData[data.courseName] = data;
            chrome.storage.local.set({ 
                [`grades_${data.courseName}`]: data,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('Error handling grade data:', error);
        }
    }

    private handleDashboardData(data: DashboardData[]): void {
        try {
            this.logger.info('Received dashboard data:', data);
            data.forEach(courseData => {
                this.dashboardData[courseData.courseName] = courseData;
                chrome.storage.local.set({
                    [`dashboard_${courseData.courseName}`]: courseData,
                    lastUpdated: new Date().toISOString()
                });
            });
            
            // Update assignments with dashboard data
            this.mergeDashboardData();
        } catch (error) {
            this.logger.error('Error handling dashboard data:', error);
        }
    }

    private mergeDashboardData(): void {
        // Update existing assignments with dashboard information
        this.assignments = this.assignments.map(assignment => {
            const dashboardAssignment = this.findDashboardAssignment(assignment);
            if (dashboardAssignment) {
                return {
                    ...assignment,
                    dueDate: new Date(dashboardAssignment.dueDate),
                    type: dashboardAssignment.type || assignment.type
                };
            }
            return assignment;
        });

        // Add new assignments from dashboard that don't exist
        Object.values(this.dashboardData).forEach(courseData => {
            courseData.assignments.forEach(dashboardAssignment => {
                const exists = this.assignments.some(a => 
                    a.title.toLowerCase() === dashboardAssignment.name.toLowerCase() &&
                    a.course === courseData.courseName
                );

                if (!exists) {
                    const newAssignment: Assignment = {
                        id: `${courseData.courseName}_${dashboardAssignment.name}`,
                        title: dashboardAssignment.name,
                        dueDate: new Date(dashboardAssignment.dueDate),
                        course: courseData.courseName,
                        courseId: courseData.courseName,
                        type: dashboardAssignment.type,
                        points: 0,
                        maxPoints: 0,
                        priorityScore: 0,
                        completed: false,
                        url: '',
                        details: {
                            isCompleted: false,
                            isLocked: false
                        }
                    };
                    this.assignments.push(newAssignment);
                }
            });
        });

        // Recalculate priorities and sort
        this.assignments.forEach(assignment => {
            assignment.priorityScore = this.priorityCalculator.calculatePriority(assignment);
        });
        this.assignments.sort((a, b) => b.priorityScore - a.priorityScore);

        // Save updated assignments
        void this.saveAssignments();
    }

    private findDashboardAssignment(assignment: Assignment): DashboardData['assignments'][0] | undefined {
        const courseData = this.dashboardData[assignment.course];
        if (!courseData) return undefined;

        return courseData.assignments.find(a => 
            a.name.toLowerCase() === assignment.title.toLowerCase()
        );
    }

    private startPeriodicSync(): void {
        if (this.syncIntervalId) {
            window.clearInterval(this.syncIntervalId);
            this.syncIntervalId = undefined;
        }
        if (this.retryTimeoutId) {
            window.clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = undefined;
        }

        void this.performSync();
        const intervalId = window.setInterval(
            () => { void this.performSync(); },
            BackgroundService.SYNC_INTERVAL
        );
        this.syncIntervalId = intervalId;
    }

    public async performSync(): Promise<void> {
        try {
            const now = Date.now();
            if (now - this.lastSyncTime < 60000) {
                return;
            }

            await this.refreshAssignments();
            this.lastSyncTime = now;
            await this.logger.info('Sync completed successfully');
            chrome.runtime.sendMessage({ type: "syncComplete", timestamp: now });
        } catch (error) {
            await this.logger.error('Sync failed', error);
            console.error("Sync failed:", error);
            const timeoutId = window.setTimeout(() => {
                void this.performSync();
            }, BackgroundService.RETRY_INTERVAL);
            this.retryTimeoutId = timeoutId;
            chrome.runtime.sendMessage({ 
                type: "syncError", 
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    }
}

// Create and export a singleton instance
export const backgroundService = new BackgroundService();

// Initialize background service and set up listeners
const initializeBackgroundService = async () => {
    try {
        // Set up global error handlers
        window.onerror = (message, source, lineno, colno, error) => {
            console.error('Global error:', { message, source, lineno, colno, error });
        };

        window.onunhandledrejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        };

        // Initialize core service
        await backgroundService.initialize();
        console.log('Background service initialized');

        // Set up alarm listener for periodic sync
        chrome.alarms.create('sync', { periodInMinutes: 30 });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'sync') {
                void backgroundService.performSync();
            }
        });

        // Add keyboard command listener
        chrome.commands.onCommand.addListener((command) => {
            if (command === 'refresh-assignments') {
                void backgroundService.performSync();
            }
        });

        // Set up dedicated PING handler
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'PING') {
                sendResponse({ success: true });
                return true;
            }
            return false;
        });

        console.log('Background service setup complete');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Failed to initialize background service:', errorMessage);
        // Re-throw to ensure service worker restarts
        throw error;
    }
};

// Start initialization
initializeBackgroundService().catch(error => {
    console.error('Critical error during background service initialization:', error);
});
