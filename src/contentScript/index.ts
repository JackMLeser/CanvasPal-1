import { Assignment } from '../types/models';
import { DebugPanel } from '../utils/debugPanel';
import { DateDebugPanel } from '../utils/dateDebugPanel';
import { DebugManager } from '../utils/debugManager';

// Create debug manager instance
const debugManager = new DebugManager();

// Function to initialize debug panels
const setupDebugPanels = () => {
    // First enable debug mode if not already enabled
    if (!debugManager.isDebugEnabled()) {
        debugManager.toggleDebugMode();
    }

    // Configure debug settings
    debugManager.updateDebugConfig({
        enabled: true,
        showDateDebug: true,
        showAssignmentDebug: true,
        showPriorityDebug: true,
        showPerformanceMetrics: true,
        logLevel: 'debug'
    });

    // Force create and show debug panels
    const mainPanel = debugManager.getMainPanel();
    const datePanel = debugManager.getDatePanel();

    // Ensure panels are in the DOM
    if (!document.getElementById('canvaspal-debug-panel')) {
        mainPanel.toggleVisibility();
    }
    if (!document.getElementById('date-debug-panel')) {
        datePanel.toggleVisibility();
    }

    console.log('Debug panels initialized and displayed');
};

export interface GradeData {
    courseName: string;
    assignments: {
        name: string;
        points: number;
        pointsPossible: number;
        weight?: number;
    }[];
}

export interface DashboardData {
    courseName: string;
    assignments: {
        name: string;
        dueDate: string;
        type: string;
    }[];
}

export class DashboardScraper {
    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            const data = this.scrapeDashboardData();
            chrome.runtime.sendMessage({ type: 'DASHBOARD_DATA', data }).catch(err => {
                console.error('Failed to send dashboard data:', err);
            });
        } catch (err) {
            console.error('Failed to scrape dashboard data:', err);
            chrome.runtime.sendMessage({
                type: 'ERROR',
                error: 'Failed to scrape dashboard data'
            }).catch(console.error);
        }
    }

    public scrapeDashboardData(): DashboardData[] {
        try {
            const dashboardData: DashboardData[] = [];
            const courseAssignments: { [courseName: string]: DashboardData['assignments'] } = {};
            
            // Find all planner items
            const plannerItems = document.querySelectorAll('.planner-item');
            plannerItems.forEach(item => {
                // Get course name
                const courseElement = item.querySelector('.course-title, .planner-course-title');
                const courseName = courseElement?.textContent?.trim() || 'Unknown Course';
                
                // Get assignment details
                const assignmentElement = item.querySelector('.planner-item-details');
                if (assignmentElement) {
                    const name = item.querySelector('.planner-item-title')?.textContent?.trim() || '';
                    const typeElement = item.querySelector('.planner-item-type');
                    const type = typeElement?.textContent?.trim() ||
                                typeElement?.getAttribute('title')?.trim() ||
                                item.querySelector('.planner-item-type-icon')?.getAttribute('title')?.trim() || '';
                    
                    // Get due date
                    const dueDateElement = item.querySelector('.planner-item-due-date, .planner-item-time');
                    let dueDate = '';
                    
                    // Parse the due date
                    if (item.querySelector('.planner-item-time-all-day')) {
                        dueDate = 'All Day';
                    } else {
                        const dueDateText = dueDateElement?.textContent?.trim() || '';
                        if (dueDateText) {
                            // Keep the original text which includes "Due: " prefix
                            dueDate = dueDateText;
                        } else {
                            dueDate = 'No due date';
                        }
                    }

                    if (name) {
                        if (!courseAssignments[courseName]) {
                            courseAssignments[courseName] = [];
                        }
                        courseAssignments[courseName].push({
                            name,
                            type,
                            dueDate: dueDate
                        });
                    }
                }
            });

            // Convert to DashboardData array
            Object.entries(courseAssignments).forEach(([courseName, assignments]) => {
                if (assignments.length > 0) {
                    dashboardData.push({ courseName, assignments });
                }
            });

            console.log('Extracted dashboard data:', dashboardData);
            return dashboardData;
        } catch (err) {
            console.error('Error in scrapeDashboardData:', err);
            throw err;
        }
    }
}

export class GradeDataScraper {
    constructor() {
        this.initialize();
    }

    private initialize() {
        if (this.isGradesPage()) {
            try {
                const data = this.scrapeGradeData();
                chrome.runtime.sendMessage({ type: 'GRADE_DATA', data }).catch(err => {
                    console.error('Failed to send grade data:', err);
                });
            } catch (err) {
                console.error('Failed to scrape grade data:', err);
                chrome.runtime.sendMessage({ 
                    type: 'ERROR', 
                    error: 'Failed to scrape grade data' 
                }).catch(console.error);
            }
        }
    }

    private isGradesPage(): boolean {
        const pageTitle = document.querySelector('h1.ic-Action-header__Heading')?.textContent;
        const hasGradesInUrl = window.location.pathname.includes('/grades');
        const hasGradesTable = document.getElementById('grades_summary') !== null;
        const hasGradesHeader = document.querySelector('.student_grades') !== null;

        return !!(pageTitle?.includes('Grade') || hasGradesInUrl || hasGradesTable || hasGradesHeader);
    }

    public scrapeGradeData(): GradeData {
        try {
            const courseTitleSelectors = [
                '.course-title',
                'h2.course-title',
                '.course_name',
                '#course_name',
                '.context_title',
                'h1.ic-Action-header__Heading'
            ];

            let courseName = '';
            for (const selector of courseTitleSelectors) {
                const element = document.querySelector(selector);
                if (element?.textContent?.trim()) {
                    courseName = element.textContent.trim();
                    break;
                }
            }

            if (!courseName) {
                const breadcrumb = document.querySelector('.ic-app-crumbs__title');
                if (breadcrumb?.textContent) {
                    courseName = breadcrumb.textContent.trim();
                } else {
                    courseName = document.title.split(':')[0].trim();
                }
            }

            const assignments: GradeData['assignments'] = [];
            const assignmentRows = document.querySelectorAll('.student_assignment, .assignment_graded');

            assignmentRows.forEach(row => {
                const nameSelectors = ['.title a', '.title', '.assignment_name'];
                let name = '';
                for (const selector of nameSelectors) {
                    const element = row.querySelector(selector);
                    if (element?.textContent?.trim()) {
                        name = element.textContent.trim();
                        break;
                    }
                }

                const gradeText = row.querySelector('.grade, .score')?.textContent;
                const possibleText = row.querySelector('.points_possible, .total-points')?.textContent;
                const weightText = row.querySelector('.assignment_group .group_weight, .weight')?.textContent;
            
                const points = gradeText === '-' || gradeText === 'not a number' ? 0 : this.parseNumber(gradeText);
                const pointsPossible = possibleText === 'also not a number' ? 0 : this.parseNumber(possibleText);
                const weight = weightText ? this.parseNumber(weightText.replace('%', '')) : undefined;
            
                if (name) {
                    assignments.push({ name, points, pointsPossible, weight });
                }
            });
            
            return { courseName, assignments };
        } catch (err) {
            console.error('Error in scrapeGradeData:', err);
            throw err;
        }
    }

    private parseNumber(value: string | null | undefined): number {
        if (!value || value === '-' || value === 'not a number' || value === 'also not a number') return 0;
        const num = parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }
}

// Initialize scrapers
const initializeScrapers = () => {
    // Check if we're on a Canvas page
    if (!document.querySelector('.ic-app')) {
        return;
    }

    // Initialize scrapers based on page type
    const isDashboard = document.querySelector('.dashboard-planner, .planner-container');
    const isGradesPage = document.querySelector('.student_grades, .gradebook-content');

    if (isDashboard) {
        console.log('Initializing dashboard scraper');
        new DashboardScraper();
    }
    if (isGradesPage) {
        console.log('Initializing grades scraper');
        new GradeDataScraper();
    }
};

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log('Content script received message:', message);
        
        switch (message.type) {
            case 'SETTINGS_UPDATED':
                console.log('Settings updated:', message.settings);
                // Store settings in local storage for quick access
                chrome.storage.local.set({ settings: message.settings })
                    .then(() => {
                        console.log('Settings saved to local storage');
                        // Re-initialize scrapers with new settings
                        initializeScrapers();
                        sendResponse({ success: true });
                    })
                    .catch(error => {
                        console.error('Failed to save settings:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Keep channel open for async response

            case 'REFRESH_ASSIGNMENTS':
                console.log('Refreshing assignments');
                initializeScrapers();
                sendResponse({ success: true });
                break;

            case 'FETCH_REQUEST':
                // Handle fetch requests from background script
                fetch(message.url, message.options)
                    .then(async response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const data = await response.json();
                        sendResponse({ success: true, data });
                    })
                    .catch(error => {
                        console.error('Fetch error:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Keep channel open for async response
            case 'ASSIGNMENTS_UPDATED':
                console.log('Assignments updated:', message.assignments);
                // Update debug panels with assignment information
                debugManager.getMainPanel().updateAssignmentInfo(message.assignments);
                sendResponse({ success: true });
                break;

            case 'DEBUG_DATE_UPDATE':
                debugManager.getDatePanel().updateDebugInfo(message.data);
                sendResponse({ success: true });
                break;

            case 'DEBUG_TOGGLE':
                if (message.panel === 'date') {
                    debugManager.getDatePanel().toggleVisibility();
                } else if (message.panel === 'main') {
                    debugManager.getMainPanel().toggleVisibility();
                }
                sendResponse({ success: true });
                break;


            default:
                console.warn('Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: 'Internal error' });
    }
    return true; // Keep the message channel open for async response
});

// Initialize on load
const initialize = async () => {
    const waitForBackgroundReady = async (retries = 0, maxRetries = 3): Promise<boolean> => {
        try {
            // Try to ping the background script
            await chrome.runtime.sendMessage({ type: 'PING' });
            console.log('Background script is ready');
            return true;
        } catch (error) {
            if (retries < maxRetries) {
                console.log(`Waiting for background script... (attempt ${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return waitForBackgroundReady(retries + 1, maxRetries);
            }
            console.error('Background script not available after retries');
            return false;
        }
    };

    try {
        // Wait for background script to be ready
        const isBackgroundReady = await waitForBackgroundReady();
        if (!isBackgroundReady) {
            throw new Error('Background script not available');
        }

        // Now notify background script that content script is ready
        await chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
        console.log('Content script ready message sent');

        // Initialize scrapers and debug panels
        const init = () => {
            // Initialize scrapers
            initializeScrapers();
            
            // Initialize debug panels
            setupDebugPanels();
            
            console.log('Initialization complete');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } catch (error) {
        console.error('Failed to initialize content script:', error);
    }
};

// Wait for a moment before initializing to ensure extension is ready
setTimeout(initialize, 500);
