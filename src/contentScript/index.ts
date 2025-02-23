console.log('CanvasPal content script loaded');

import { initializeButton } from './canvasButton';
import { AssignmentDetector } from '../utils/assignmentDetector';

// Initialize the extension
const initialize = async () => {
    try {
        console.log('Initializing CanvasPal extension');

        // Initialize button and popup
        initializeButton();

        // Initialize assignment detector
        const detector = new AssignmentDetector();
        
        // Detect assignments and send to background script
        const assignments = await detector.detectAssignments();
        console.log('Detected assignments:', assignments);
        
        // Send assignments to background script
        chrome.runtime.sendMessage({
            type: 'DASHBOARD_DATA',
            data: assignments.map(assignment => ({
                courseName: assignment.course,
                id: assignment.courseId,
                assignments: [{
                    name: assignment.title,
                    dueDate: assignment.dueDate,
                    type: assignment.type
                }]
            }))
        });

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
