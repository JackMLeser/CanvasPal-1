console.log('Background script loaded');

import { Assignment, AssignmentType } from '../types/models';

// Store for assignments
let assignments: Assignment[] = [];

// Function to calculate priority score
function calculatePriorityScore(assignment: Assignment): number {
    let score = 0;
    const weights = {
        DUE_DATE: 0.4,
        POINTS: 0.35,
        TYPE: 0.25
    };

    // Due date priority (higher priority for closer due dates)
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let dateScore = 0;
    if (daysUntilDue <= 0) dateScore = 1.5; // Past due
    else if (daysUntilDue <= 1) dateScore = 1.2; // Due within 24 hours
    else if (daysUntilDue <= 3) dateScore = 1.0; // Due within 3 days
    else if (daysUntilDue <= 7) dateScore = 0.8; // Due within a week
    else if (daysUntilDue <= 14) dateScore = 0.5; // Due within 2 weeks
    else dateScore = 0.3; // Due later

    // Points priority (higher priority for assignments worth more points)
    let pointsScore = 0;
    if (assignment.maxPoints >= 100) pointsScore = 1.0;
    else if (assignment.maxPoints >= 50) pointsScore = 0.9;
    else if (assignment.maxPoints >= 20) pointsScore = 0.7;
    else if (assignment.maxPoints >= 10) pointsScore = 0.5;
    else pointsScore = 0.3;

    // Type priority and title-based adjustments
    let typeScore = 0;
    const title = assignment.title.toLowerCase();
    if (title.includes('exam') || title.includes('final') || title.includes('midterm')) {
        typeScore = 1.4; // Highest priority for exams
    } else {
        switch (assignment.type.toLowerCase()) {
            case 'quiz':
                typeScore = 1.2;
                break;
            case 'assignment':
                typeScore = 1.0;
                break;
            case 'discussion':
                typeScore = 0.8;
                break;
            default:
                typeScore = 1.0;
        }
    }

    // Calculate weighted score
    score = (dateScore * weights.DUE_DATE) +
            (pointsScore * weights.POINTS) +
            (typeScore * weights.TYPE);

    // Add priority details to assignment
    assignment.priorityDetails = {
        dueStatus: getDueStatus(daysUntilDue),
        daysUntilDue,
        pointsImpact: getPointsImpact(assignment.maxPoints),
        typeImportance: getTypeImportance(assignment.type, title),
        components: {
            dueDateScore: dateScore,
            gradeImpactScore: pointsScore,
            typeScore: typeScore
        }
    };

    // Cap final score at 1.5
    return Math.min(Math.max(score, 0), 1.5);
}

function getDueStatus(daysUntilDue: number): 'overdue' | 'due-soon' | 'upcoming' | 'far-future' {
    if (daysUntilDue <= 0) return 'overdue';
    if (daysUntilDue <= 1) return 'due-soon';
    if (daysUntilDue <= 7) return 'upcoming';
    return 'far-future';
}

function getPointsImpact(points: number): 'high' | 'medium' | 'low' {
    if (points >= 50) return 'high';
    if (points >= 20) return 'medium';
    return 'low';
}

function getTypeImportance(type: string, title: string): 'critical' | 'high' | 'normal' | 'low' {
    if (title.includes('exam') || title.includes('final') || title.includes('midterm')) {
        return 'critical';
    }
    switch (type.toLowerCase()) {
        case 'quiz':
            return 'high';
        case 'assignment':
            return 'normal';
        case 'discussion':
            return 'low';
        default:
            return 'normal';
    }
}

// Function to notify all tabs about assignment updates
function notifyTabs() {
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
                    // Create assignment with all data from detector
                    const newAssignment: Assignment = {
                        id: `${course.courseName}-${assignment.name}`,
                        title: assignment.name,
                        dueDate: assignment.dueDate,
                        course: course.courseName,
                        courseId: course.id?.toString() || '0',
                        type: assignment.type,
                        points: assignment.points || 0,
                        maxPoints: assignment.maxPoints || assignment.points || 0,
                        completed: assignment.completed || false,
                        priorityScore: assignment.priorityScore || 0,
                        url: assignment.url || '#',
                        details: {
                            isCompleted: assignment.completed || false,
                            isLocked: assignment.locked || false,
                            submissionType: assignment.submissionType,
                            description: assignment.description
                        },
                        priorityDetails: assignment.priorityDetails || {
                            dueStatus: getDueStatus(Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
                            daysUntilDue: Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                            pointsImpact: getPointsImpact(assignment.maxPoints || 0),
                            typeImportance: getTypeImportance(assignment.type, assignment.name),
                            components: {
                                dueDateScore: 0,
                                gradeImpactScore: 0,
                                typeScore: 0
                            }
                        }
                    };

                    // Only calculate priority if not provided
                    if (!newAssignment.priorityScore) {
                        newAssignment.priorityScore = calculatePriorityScore(newAssignment);
                    }

                    dashboardAssignments.push(newAssignment);
                });
            });

            // Sort and store assignments
            dashboardAssignments.sort((a, b) => b.priorityScore - a.priorityScore);
            assignments = dashboardAssignments;
            notifyTabs();
            break;

        case 'GRADE_DATA':
            console.log('Processing grade data:', message.data);
            if (message.data?.assignments) {
                message.data.assignments.forEach((gradeData: any) => {
                    const assignment = assignments.find(a => a.title === gradeData.name);
                    if (assignment) {
                        assignment.points = gradeData.points;
                        assignment.maxPoints = gradeData.pointsPossible;
                        assignment.gradeWeight = gradeData.weight;
                        assignment.priorityScore = calculatePriorityScore(assignment);
                    }
                });

                // Sort and notify about updates
                assignments.sort((a, b) => b.priorityScore - a.priorityScore);
                notifyTabs();
            }
            break;

        case 'GET_ASSIGNMENTS':
            console.log('Sending assignments:', assignments);
            sendResponse({ assignments });
            break;

        case 'CLEAR_ASSIGNMENTS':
            assignments = [];
            sendResponse({ success: true });
            break;

        case 'OPEN_OPTIONS_PAGE':
            chrome.runtime.openOptionsPage();
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
