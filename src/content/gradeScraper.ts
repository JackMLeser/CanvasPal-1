import { Assignment, AssignmentType } from '../types/models';

function scrapeAssignments(): Assignment[] {
    console.log('CanvasPal: Starting comprehensive assignment detection');
    
    const strategies = [
        findAssignmentsInDashboard,
        findAssignmentsInTodoList,
        findAssignmentsInCourseList,
        findAssignmentsGeneric
    ];

    for (const strategy of strategies) {
        try {
            const assignments = strategy();
            if (assignments.length > 0) {
                console.log(`CanvasPal: Found ${assignments.length} assignments using strategy`);
                return assignments;
            }
        } catch (error) {
            console.warn(`CanvasPal: Strategy failed:`, error);
        }
    }

    console.warn('CanvasPal: No assignments found using any strategy');
    return [];
}

function findAssignmentsGeneric(): Assignment[] {
    const selectors = [
        '.assignment-list-item',
        '.todo-list-item',
        '.assignment',
        '.to-do-item',
        '[data-assignment-id]',
        '.ic-DashboardCard__action'
    ];

    const assignments: Assignment[] = [];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            const titleEl = el.querySelector('.title, .name, .item-title') || el;
            const courseEl = el.closest('.course-name') || document.querySelector('.course-title');
            const dueDateEl = el.querySelector('.due-date, .date');

            if (titleEl?.textContent?.trim()) {
                try {
                    const assignment: Assignment = {
                        id: `generic_${index}`,
                        title: titleEl.textContent.trim(),
                        course: courseEl?.textContent?.trim() || 'Unknown Course',
                        dueDate: dueDateEl?.textContent ? new Date(dueDateEl.textContent) : new Date(),
                        type: 'assignment' as AssignmentType,
                        priorityScore: Math.random(),
                        points: 0,
                        maxPoints: 0,
                        completed: false,
                        courseId: undefined,
                        gradeWeight: undefined,
                        courseGrade: undefined,
                        url: undefined,
                        details: undefined
                    };

                    assignments.push(assignment);
                } catch (error) {
                    console.warn('CanvasPal: Error creating assignment:', error);
                }
            }
        });
    });

    return assignments;
}

function findAssignmentsInDashboard(): Assignment[] {
    const dashboardItems = document.querySelectorAll('.ic-DashboardCard__action, .dashboard-assignment');
    
    return Array.from(dashboardItems)
        .map((el, index) => {
            const titleEl = el.querySelector('.title, .name');
            const courseEl = el.closest('.ic-DashboardCard') || document.querySelector('.course-title');
            const dueDateEl = el.querySelector('.due-date');

            if (!titleEl?.textContent?.trim()) return null;

            return {
                id: `dashboard_${index}`,
                title: titleEl.textContent.trim(),
                course: courseEl?.textContent?.trim() || 'Unknown Course',
                dueDate: dueDateEl?.textContent ? new Date(dueDateEl.textContent) : new Date(),
                type: 'assignment' as AssignmentType,
                priorityScore: Math.random(),
                points: 0,
                maxPoints: 0,
                completed: false,
                courseId: undefined,
                gradeWeight: undefined,
                courseGrade: undefined,
                url: undefined,
                details: undefined
            };
        })
        .filter((assignment): assignment is Assignment => assignment !== null);
}

function findAssignmentsInTodoList(): Assignment[] {
    const todoItems = document.querySelectorAll('.todo-list .todo-item, .to-do-list .to-do-item');
    
    return Array.from(todoItems)
        .map((el, index) => {
            const titleEl = el.querySelector('.todo-title, .to-do-title');
            const courseEl = el.querySelector('.course-name');
            const dueDateEl = el.querySelector('.due-date');

            if (!titleEl?.textContent?.trim()) return null;

            return {
                id: `todo_${index}`,
                title: titleEl.textContent.trim(),
                course: courseEl?.textContent?.trim() || 'Unknown Course',
                dueDate: dueDateEl?.textContent ? new Date(dueDateEl.textContent) : new Date(),
                type: 'assignment' as AssignmentType,
                priorityScore: Math.random(),
                points: 0,
                maxPoints: 0,
                completed: false,
                courseId: undefined,
                gradeWeight: undefined,
                courseGrade: undefined,
                url: undefined,
                details: undefined
            };
        })
        .filter((assignment): assignment is Assignment => assignment !== null);
}

function findAssignmentsInCourseList(): Assignment[] {
    const courseItems = document.querySelectorAll('.course-item, .assignment-list-item');
    
    return Array.from(courseItems)
        .map((el, index) => {
            const titleEl = el.querySelector('.title, .name');
            const courseEl = el.closest('.course-name') || document.querySelector('.course-title');
            const dueDateEl = el.querySelector('.due-date');

            if (!titleEl?.textContent?.trim()) return null;

            return {
                id: `course_${index}`,
                title: titleEl.textContent.trim(),
                course: courseEl?.textContent?.trim() || 'Unknown Course',
                dueDate: dueDateEl?.textContent ? new Date(dueDateEl.textContent) : new Date(),
                type: 'assignment' as AssignmentType,
                priorityScore: Math.random(),
                points: 0,
                maxPoints: 0,
                completed: false,
                courseId: undefined,
                gradeWeight: undefined,
                courseGrade: undefined,
                url: undefined,
                details: undefined
            };
        })
        .filter((assignment): assignment is Assignment => assignment !== null);
}

// Message listener for assignment requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getAssignments") {
        console.log('CanvasPal: Received assignment request');
        const assignments = scrapeAssignments();
        
        console.log(`CanvasPal: Sending ${assignments.length} assignments`);
        
        sendResponse({ 
            assignments: assignments,
            success: assignments.length > 0
        });
        
        return true;  // Indicates we wish to send a response asynchronously
    }
});

// Ensure content script is loaded
console.log('CanvasPal Content Script Loaded');
