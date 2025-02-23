console.log('CanvasPal content script loaded');

import { initializeButton } from './canvasButton';

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
        await waitForElements();
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
