import { GradeData } from '../types/models';

interface GradeAssignment {
    name: string;
    points: number;
    pointsPossible: number;
    weight: number;
}

function scrapeGrades(): GradeData | null {
    console.log('CanvasPal: Starting grade scraping...');
    
    try {
        // Try multiple selectors for course title
        const courseTitleSelectors = [
            '.course-title',
            '.ig-header .name',
            '.course_name',
            '#course_name',
            '.course-nav-link'
        ];
        
        const courseTitle = courseTitleSelectors
            .map(selector => document.querySelector(selector))
            .find(el => el?.textContent?.trim())?.textContent?.trim() || 'Unknown Course';

        // Try multiple selectors for grade table
        const gradeTableSelectors = [
            '.student_assignments',
            '#grades_summary',
            '.assignment-grades',
            '.gradebook-table'
        ];
        
        const gradeTable = gradeTableSelectors
            .map(selector => document.querySelector(selector))
            .find(el => el);

        if (!gradeTable) {
            console.warn('CanvasPal: Grade table not found - this might not be a grades page');
            return null;
        }

        console.log('CanvasPal: Found course:', courseTitle);

        // Try multiple selectors for assignment rows
        const assignmentRowSelectors = [
            'tr.student_assignment',
            '.assignment-row',
            '.slick-row',
            '.grade-values'
        ];
        
        let assignments: GradeAssignment[] = [];
        for (const selector of assignmentRowSelectors) {
            const rows = gradeTable.querySelectorAll(selector);
            if (rows.length > 0) {
                assignments = Array.from(rows).map(row => {
                    const nameSelectors = ['.assignment_name', '.title', '.assignment-name'];
                    const gradeSelectors = ['.grade', '.score', '.points'];
                    const possibleSelectors = ['.points_possible', '.max-points'];
                    const weightSelectors = ['.assignment_weight', '.weight'];

                    const name = nameSelectors
                        .map(s => row.querySelector(s))
                        .find(el => el?.textContent?.trim())?.textContent?.trim() || 'Unknown Assignment';
                    
                    const points = parseFloat(gradeSelectors
                        .map(s => row.querySelector(s))
                        .find(el => el?.textContent?.trim())?.textContent?.trim() || '0');
                    
                    const pointsPossible = parseFloat(possibleSelectors
                        .map(s => row.querySelector(s))
                        .find(el => el?.textContent?.trim())?.textContent?.trim() || '0');
                    
                    const weight = parseFloat(weightSelectors
                        .map(s => row.querySelector(s))
                        .find(el => el?.textContent?.trim())?.textContent?.trim() || '0');

                    return {
                        name,
                        points,
                        pointsPossible,
                        weight
                    };
                });
                break;
            }
        }

        if (assignments.length === 0) {
            console.warn('CanvasPal: No assignments found in grade table');
            return null;
        }

        console.log('CanvasPal: Found', assignments.length, 'assignments');
        const data: GradeData = {
            courseName: courseTitle,
            assignments
        };
        
        console.log('CanvasPal: Successfully scraped data:', data);
        return data;
    } catch (error) {
        console.error('CanvasPal: Error scraping grades:', error);
        return null;
    }
}

// Message listener for grade data requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getGrades') {
        console.log('CanvasPal: Received grade request');
        const grades = scrapeGrades();
        sendResponse({ 
            grades,
            success: grades !== null
        });
        return true;  // Indicates we wish to send a response asynchronously
    }
});

// Initialize grade scraping when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrapeGrades);
} else {
    scrapeGrades();
}
