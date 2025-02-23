console.log('CanvasPal content script loaded');

import { initializeButton } from './canvasButton';

// Initialize the extension
const initialize = async () => {
    try {
        console.log('Initializing CanvasPal extension');

        // Initialize button and popup
        initializeButton();

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
