import { Assignment } from '../types/models';
import { AssignmentRenderer } from '../utils/assignmentRenderer';
import { logger } from '../utils/logger';
import { DebugManager } from '../utils/debugManager';

interface Settings {
    icalUrl?: string;
    weights?: {
        dueDate: number;
        gradeWeight: number;
        impact: number;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const assignmentList = document.getElementById('assignment-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const settingsForm = document.getElementById('settings-form') as HTMLFormElement;
    const urlInput = document.getElementById('ical-url') as HTMLInputElement;
    const dueDateWeight = document.getElementById('due-date-weight') as HTMLInputElement;
    const gradeWeight = document.getElementById('grade-weight') as HTMLInputElement;
    const impactWeight = document.getElementById('impact-weight') as HTMLInputElement;

    let currentAssignments: Assignment[] = [];
    let currentFilter = 'all';

    // Load and display assignments
    chrome.storage.sync.get(['assignments'], (result) => {
        if (result.assignments) {
            currentAssignments = result.assignments;
            displayAssignments(currentAssignments, currentFilter);
        }
    });

    // Load settings
    chrome.storage.sync.get(['settings'], (result) => {
        const settings: Settings = result.settings || {};
        if (settings.icalUrl) {
            urlInput.value = settings.icalUrl;
        }
        if (settings.weights) {
            dueDateWeight.value = settings.weights.dueDate.toString();
            gradeWeight.value = settings.weights.gradeWeight.toString();
            impactWeight.value = settings.weights.impact.toString();
        }
    });

    // Filter button click handlers
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter') || 'all';
            currentFilter = filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayAssignments(currentAssignments, filter);
        });
    });

    // Settings form submit handler
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const settings: Settings = {
            icalUrl: urlInput.value,
            weights: {
                dueDate: parseFloat(dueDateWeight.value),
                gradeWeight: parseFloat(gradeWeight.value),
                impact: parseFloat(impactWeight.value)
            }
        };
        chrome.storage.sync.set({ settings }, () => {
            logger.info('Settings saved');
            // Trigger assignment refresh
            chrome.runtime.sendMessage({ type: 'refreshAssignments' });
        });
    });
});

function displayAssignments(assignments: Assignment[], filter: string) {
    const filteredAssignments = filterAssignments(assignments, filter);
    const assignmentList = document.getElementById('assignment-list');
    if (!assignmentList) return;

    assignmentList.innerHTML = '';
    
    if (filteredAssignments.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No assignments found';
        assignmentList.appendChild(emptyMessage);
        return;
    }

    const container = AssignmentRenderer.renderAssignmentList(filteredAssignments);
    assignmentList.appendChild(container);
}

function filterAssignments(assignments: Assignment[], filter: string): Assignment[] {
    return assignments.filter(assignment => {
        switch (filter) {
            case 'high':
                return assignment.priority >= 0.7;
            case 'medium':
                return assignment.priority >= 0.4 && assignment.priority < 0.7;
            case 'low':
                return assignment.priority < 0.4;
            default:
                return true;
        }
    });
}
