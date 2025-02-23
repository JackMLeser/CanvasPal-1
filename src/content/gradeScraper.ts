import { GradeData, Settings } from '../types/models';

// Store settings locally
let currentSettings: Settings | null = null;

interface GradeAssignment {
    name: string;
    points: number;
    pointsPossible: number;
    weight: number;
}

function scrapeGrades(): GradeData | null {
    console.log('CanvasPal: Starting grade scraping...');
    
    try {
        // Check if we're on a grades page
        const pageTitle = document.querySelector('h1.ic-Action-header__Heading')?.textContent;
        if (!pageTitle?.includes('Grades')) {
            console.warn('CanvasPal: Not on a grades page');
            return null;
        }

        // Updated selectors for course title, including the page title which always contains the course name
        const courseTitleSelectors = [
            'h1.page-title',
            '.course-title',
            '.ig-header .name',
            '.course_name',
            '#course_name',
            '.course-nav-link',
            // Add FGCU specific selectors
            'title',  // The page title contains course name
            '.context_title'
        ];
        
        let courseTitle = '';
        for (const selector of courseTitleSelectors) {
            const el = document.querySelector(selector);
            if (el?.textContent?.trim()) {
                courseTitle = el.textContent.trim();
                // If we found it in the page title, extract just the course name
                if (selector === 'title') {
                    const match = courseTitle.match(/: (.+?) -/);
                    if (match) {
                        courseTitle = match[1];
                    }
                }
                break;
            }
        }

        if (!courseTitle) {
            courseTitle = 'Unknown Course';
        }

        // Updated selectors for grade table
        const gradeTableSelectors = [
            '#grades_summary',
            '.student_assignments',
            '.assignment-grades',
            '.gradebook-table',
            // Add FGCU specific selectors
            '.student_assignment_table',
            '#assignments-not-weighted',
            '#assignments-weighted'
        ];
        
        const gradeTable = gradeTableSelectors
            .map(selector => document.querySelector(selector))
            .find(el => el);

        if (!gradeTable) {
            console.warn('CanvasPal: Grade table not found - this might not be a grades page');
            return null;
        }

        console.log('CanvasPal: Found course:', courseTitle);

        // Updated selectors for assignment rows
        const assignmentRowSelectors = [
            'tr.student_assignment',
            '.assignment-row',
            '.slick-row',
            '.grade-values',
            // Add FGCU specific selectors
            '.group_total',
            '.group_grade',
            '.assignment_graded'
        ];
        
        let assignments: GradeAssignment[] = [];
        for (const selector of assignmentRowSelectors) {
            const rows = gradeTable.querySelectorAll(selector);
            if (rows.length > 0) {
                assignments = Array.from(rows)
                    .filter(row => {
                        // Skip rows that are muted or pending
                        const isMuted = row.getAttribute('data-muted') === 'true';
                        const isPending = row.getAttribute('data-pending_quiz') === 'true';
                        const isGroupTotal = row.classList.contains('group_total');
                        const isFinalGrade = row.classList.contains('final_grade');
                        return !isMuted && !isPending && !isGroupTotal && !isFinalGrade;
                    })
                    .map(row => {
                        const nameSelectors = [
                            '.assignment_name',
                            '.title',
                            '.assignment-name',
                            '.assignment_title',
                            '.name'
                        ];
                        const gradeSelectors = [
                            '.grade',
                            '.score',
                            '.points',
                            '.assignment_score',
                            '.total_grade'
                        ];
                        const possibleSelectors = [
                            '.points_possible',
                            '.max-points',
                            '.total_possible'
                        ];
                        const weightSelectors = [
                            '.assignment_weight',
                            '.weight',
                            '.group_weight'
                        ];

                        // Get assignment name from link or text
                        const nameLink = row.querySelector('th.title a');
                        const name = (nameLink?.textContent?.trim() ||
                            nameSelectors
                                .map(s => row.querySelector(s))
                                .find(el => el?.textContent?.trim())?.textContent?.trim() ||
                            'Unknown Assignment');
                        
                        // Get points, handling special cases
                        let points = 0;
                        const scoreHolder = row.querySelector('.score_holder');
                        if (scoreHolder) {
                            const originalPoints = scoreHolder.querySelector('.original_points')?.textContent?.trim();
                            if (originalPoints) {
                                points = parseFloat(originalPoints) || 0;
                            } else {
                                points = parseFloat(gradeSelectors
                                    .map(s => row.querySelector(s))
                                    .find(el => el?.textContent?.trim())?.textContent?.trim()?.replace(/[^0-9.-]/g, '') || '0');
                            }
                        }
                        
                        // Get points possible
                        const pointsPossible = parseFloat(possibleSelectors
                            .map(s => row.querySelector(s))
                            .find(el => el?.textContent?.trim())?.textContent?.trim()?.replace(/[^0-9.-]/g, '') || '0');
                        
                        // Get weight
                        const weight = parseFloat(weightSelectors
                            .map(s => row.querySelector(s))
                            .find(el => el?.textContent?.trim())?.textContent?.trim()?.replace(/[^0-9.-]/g, '') || '0');

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

// Initialize settings
async function initializeSettings(): Promise<void> {
    try {
        const result = await chrome.storage.sync.get('settings');
        currentSettings = result.settings;
        console.log('CanvasPal: Settings loaded:', currentSettings);
    } catch (error) {
        console.error('CanvasPal: Error loading settings:', error);
    }
}

// Message listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle grade requests
    if (message.action === 'getGrades') {
        console.log('CanvasPal: Received grade request');
        const grades = scrapeGrades();
        sendResponse({
            grades,
            success: grades !== null
        });
        return true;
    }
    
    // Handle settings updates
    if (message.type === 'SETTINGS_UPDATED') {
        console.log('CanvasPal: Received settings update:', message.settings);
        currentSettings = message.settings;
        // Re-run grade scraping with new settings if we're on a grades page
        if (document.querySelector('h1.ic-Action-header__Heading')?.textContent?.includes('Grades')) {
            scrapeGrades();
        }
        sendResponse({ success: true });
        return true;
    }
});

// Load settings on initialization
initializeSettings();

// Initialize grade scraping when page loads
const initializeScraping = () => {
    // Wait for the grades table to be visible
    const observer = new MutationObserver((mutations, obs) => {
        const gradesTable = document.getElementById('grades_summary');
        if (gradesTable) {
            obs.disconnect();
            scrapeGrades();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScraping);
} else {
    initializeScraping();
}
