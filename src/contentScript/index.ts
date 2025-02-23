console.log('CanvasPal content script loaded');

import { initializeButton } from './canvasButton';
import { initializeScrapers, DashboardScraper, GradeDataScraper, DashboardData, GradeData } from './scrapers';

interface Assignment {
    title: string;
    dueDate: string;
    courseName: string;
    type: string;
    points: number;
    maxPoints?: number;
    weight?: number;
    priorityScore: number;
}

// Wait for both head and body to be available
const waitForElements = () => {
    return new Promise<void>((resolve) => {
        const checkElements = () => {
            if (document.head && document.body) {
                resolve();
            } else {
                requestAnimationFrame(checkElements);
            }
        };
        checkElements();
    });
};

// Process scraped data and send to background
const processScrapedData = (dashboardData: DashboardData[] | null, gradeData: GradeData | null) => {
    console.log('Processing scraped data:', { dashboardData, gradeData });
    
    const assignments: Assignment[] = [];

    // Process dashboard assignments
    if (dashboardData) {
        for (const course of dashboardData) {
            for (const assignment of course.assignments) {
                assignments.push({
                    title: assignment.name,
                    dueDate: assignment.dueDate,
                    courseName: course.courseName,
                    type: assignment.type,
                    points: 0, // Will be updated with grade data
                    priorityScore: 0.5 // Default score
                });
            }
        }
    }

    // Update assignments with grade data
    if (gradeData) {
        const gradeMap = new Map<string, {
            points: number;
            pointsPossible: number;
            weight?: number;
        }>();

        gradeData.assignments.forEach(assignment => {
            gradeMap.set(assignment.name, {
                points: assignment.points,
                pointsPossible: assignment.pointsPossible,
                weight: assignment.weight
            });
        });

        assignments.forEach(assignment => {
            const gradeInfo = gradeMap.get(assignment.title);
            if (gradeInfo) {
                assignment.points = gradeInfo.points;
                assignment.maxPoints = gradeInfo.pointsPossible;
                assignment.weight = gradeInfo.weight;
            }
        });
    }

    console.log('Processed assignments:', assignments);

    // Send assignments to background script
    if (assignments.length > 0) {
        console.log('Sending assignments to background script');
        chrome.runtime.sendMessage({
            type: 'ASSIGNMENTS_UPDATE',
            data: assignments
        }, (response) => {
            console.log('Background script response:', response);
        });
    } else {
        console.log('No assignments to send');
    }
};

// Initialize the extension
const initialize = async () => {
    try {
        console.log('Initializing CanvasPal extension');
        await waitForElements();

        // Initialize button and popup
        initializeButton();

        // Initialize scrapers
        console.log('Initializing scrapers');
        initializeScrapers();

        // Listen for scraped data
        chrome.runtime.onMessage.addListener((message: { type: string; data: any }, sender, sendResponse) => {
            console.log('Received message:', message);
            try {
                if (message.type === 'DASHBOARD_DATA' || message.type === 'GRADE_DATA') {
                    const dashboardData = message.type === 'DASHBOARD_DATA' ? message.data as DashboardData[] : null;
                    const gradeData = message.type === 'GRADE_DATA' ? message.data as GradeData : null;
                    processScrapedData(dashboardData, gradeData);
                }
            } catch (error) {
                console.error('Error processing scraped data:', error);
            }
        });

        // Set up periodic refresh
        setInterval(() => {
            console.log('Running periodic refresh');
            if (document.querySelector('.ic-app')) {
                const isDashboard = document.querySelector('.dashboard-planner, .planner-container');
                const isGradesPage = document.querySelector('.student_grades, .gradebook-content');

                if (isDashboard) {
                    console.log('Refreshing dashboard data');
                    new DashboardScraper();
                }
                if (isGradesPage) {
                    console.log('Refreshing grades data');
                    new GradeDataScraper();
                }
            }
        }, 60000); // Refresh every minute

        // Initial scrape
        if (document.querySelector('.ic-app')) {
            console.log('Running initial scrape');
            const isDashboard = document.querySelector('.dashboard-planner, .planner-container');
            const isGradesPage = document.querySelector('.student_grades, .gradebook-content');

            if (isDashboard) {
                console.log('Initial dashboard scrape');
                new DashboardScraper();
            }
            if (isGradesPage) {
                console.log('Initial grades scrape');
                new GradeDataScraper();
            }
        }

    } catch (error) {
        console.error('Error initializing CanvasPal:', error);
    }
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
