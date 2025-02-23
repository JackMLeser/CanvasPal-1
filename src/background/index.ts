console.log('Background script loaded');

import { Assignment, AssignmentType } from '../types/models';

// Store for assignments
let assignments: Assignment[] = [];

// Function to calculate priority score
function calculatePriorityScore(assignment: Assignment): number {
    let score = 0;

    // Due date priority (higher priority for closer due dates)
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 0) score += 1; // Past due or due today
    else if (daysUntilDue <= 1) score += 0.9; // Due tomorrow
    else if (daysUntilDue <= 3) score += 0.8; // Due in 2-3 days
    else if (daysUntilDue <= 7) score += 0.6; // Due in 4-7 days
    else score += 0.3; // Due in more than a week

    // Points priority (higher priority for assignments worth more points)
    if (assignment.maxPoints) {
        const pointsRatio = assignment.maxPoints / 100; // Normalize to 0-1 range
        score += pointsRatio * 0.5; // Points contribute up to 0.5 to the score
    }

    // Type priority
    switch (assignment.type.toLowerCase()) {
        case 'quiz':
            score += 0.2; // Higher priority for quizzes
            break;
        case 'assignment':
            score += 0.1; // Medium priority for regular assignments
            break;
        case 'discussion':
            score += 0.05; // Lower priority for discussions
            break;
    }

    // Normalize final score to 0-1 range
    return Math.min(Math.max(score / 2, 0), 1);
}

// Function to process and store assignments
function processAssignments(newAssignments: Assignment[]) {
    console.log('Processing assignments:', newAssignments);

    // Calculate priority scores
    newAssignments.forEach(assignment => {
        assignment.priorityScore = calculatePriorityScore(assignment);
    });

    // Sort by priority score
    newAssignments.sort((a, b) => b.priorityScore - a.priorityScore);

    // Update stored assignments
    assignments = newAssignments;

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
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    switch (message.type) {
        case 'DASHBOARD_DATA':
            console.log('Processing dashboard data:', message.data);
            const dashboardAssignments: Assignment[] = [];
            message.data.forEach((course: any) => {
                course.assignments.forEach((assignment: any) => {
                    dashboardAssignments.push({
                        id: `${course.courseName}-${assignment.name}`,
                        title: assignment.name,
                        dueDate: assignment.dueDate,
                        course: course.courseName,
                        courseId: course.id?.toString() || '0',
                        type: assignment.type,
                        points: 0,
                        maxPoints: 0,
                        completed: false,
                        priorityScore: 0,
                        url: '#',
                        details: {
                            isCompleted: false,
                            isLocked: false
                        }
                    });
                });
            });
            processAssignments(dashboardAssignments);
            break;

        case 'GRADE_DATA':
            console.log('Processing grade data:', message.data);
            // Update points for existing assignments
            const gradeMap = new Map();
            message.data.assignments.forEach((assignment: any) => {
                gradeMap.set(assignment.name, {
                    points: assignment.points,
                    maxPoints: assignment.pointsPossible,
                    weight: assignment.weight
                });
            });

            assignments.forEach(assignment => {
                const gradeInfo = gradeMap.get(assignment.title);
                if (gradeInfo) {
                    assignment.points = gradeInfo.points;
                    assignment.maxPoints = gradeInfo.maxPoints;
                    assignment.gradeWeight = gradeInfo.weight;
                    assignment.priorityScore = calculatePriorityScore(assignment);
                }
            });

            // Sort and notify about updates
            assignments.sort((a, b) => b.priorityScore - a.priorityScore);
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

        case 'GET_ASSIGNMENTS':
            console.log('Sending assignments:', assignments);
            sendResponse({ assignments });
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
