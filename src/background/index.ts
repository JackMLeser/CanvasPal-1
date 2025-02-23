console.log('Background script loaded');

interface Assignment {
    title: string;
    dueDate: string;
    points: number;
    courseName: string;
    priorityScore: number;
}

// Store for assignments
let assignments: Assignment[] = [];

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.type) {
        case 'GET_ASSIGNMENTS':
            // Return current assignments
            sendResponse({ assignments });
            break;

        case 'ASSIGNMENTS_UPDATE':
            // Update stored assignments
            assignments = message.data;
            // Notify all tabs about the update
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'ASSIGNMENTS_UPDATE',
                            data: assignments
                        }).catch(error => {
                            console.log('Error sending message to tab:', error);
                        });
                    }
                });
            });
            break;

        case 'CLEAR_ASSIGNMENTS':
            assignments = [];
            sendResponse({ success: true });
            break;
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
    // Initialize storage
    chrome.storage.local.set({
        settings: {
            displayOptions: {
                showOutsideCanvas: true
            }
        }
    });
});

// Handle alarm for periodic assignment updates
chrome.alarms.create('refreshAssignments', {
    periodInMinutes: 5 // Check every 5 minutes
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'refreshAssignments') {
        // Notify tabs to refresh assignments
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'REFRESH_ASSIGNMENTS'
                    }).catch(error => {
                        console.log('Error sending refresh message to tab:', error);
                    });
                }
            });
        });
    }
});
