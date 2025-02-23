console.log('CanvasPal content script loaded');

import { initializeButton } from './canvasButton';
import { AssignmentDetector } from '../utils/assignmentDetector';
import { Assignment } from '../types/models';

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

// Initialize the extension
const initialize = async () => {
    try {
        console.log('Initializing CanvasPal extension');
        await waitForElements();

        // Initialize button and popup
        initializeButton();

        // Initialize assignment detector
        const detector = new AssignmentDetector();

        // Listen for messages
        chrome.runtime.onMessage.addListener((message: { type: string; data: any }, sender, sendResponse) => {
            console.log('Content script received message:', message);
            try {
                switch (message.type) {
                    case 'REFRESH_ASSIGNMENTS':
                        // Detect assignments and send to background
                        console.log('Refreshing assignments');
                        detector.detectAssignments().then(assignments => {
                            console.log('Detected assignments:', assignments);
                            chrome.runtime.sendMessage({
                                type: 'DASHBOARD_DATA',
                                data: [{
                                    courseName: 'Current Course',
                                    assignments: assignments.map(a => ({
                                        name: a.title,
                                        dueDate: a.dueDate,
                                        type: a.type
                                    }))
                                }]
                            });

                            // Also send grade data
                            chrome.runtime.sendMessage({
                                type: 'GRADE_DATA',
                                data: {
                                    courseName: 'Current Course',
                                    assignments: assignments.map(a => ({
                                        name: a.title,
                                        points: a.points,
                                        pointsPossible: a.maxPoints,
                                        weight: a.gradeWeight
                                    }))
                                }
                            });
                        }).catch(error => {
                            console.error('Error detecting assignments:', error);
                        });
                        break;
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        // Initial assignment detection
        if (document.querySelector('.ic-app')) {
            console.log('Running initial assignment detection');
            detector.detectAssignments().then(assignments => {
                console.log('Initial assignments detected:', assignments);
                chrome.runtime.sendMessage({
                    type: 'DASHBOARD_DATA',
                    data: [{
                        courseName: 'Current Course',
                        assignments: assignments.map(a => ({
                            name: a.title,
                            dueDate: a.dueDate,
                            type: a.type
                        }))
                    }]
                });

                chrome.runtime.sendMessage({
                    type: 'GRADE_DATA',
                    data: {
                        courseName: 'Current Course',
                        assignments: assignments.map(a => ({
                            name: a.title,
                            points: a.points,
                            pointsPossible: a.maxPoints,
                            weight: a.gradeWeight
                        }))
                    }
                });
            }).catch(error => {
                console.error('Error in initial assignment detection:', error);
            });
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
