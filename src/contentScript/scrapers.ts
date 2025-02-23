export interface GradeData {
    courseName: string;
    assignments: {
        name: string;
        points: number;
        pointsPossible: number;
        weight?: number;
    }[];
}

export interface DashboardData {
    courseName: string;
    assignments: {
        name: string;
        dueDate: string;
        type: string;
    }[];
}

export class DashboardScraper {
    constructor() {
        this.initialize();
    }

    private initialize() {
        try {
            const data = this.scrapeDashboardData();
            chrome.runtime.sendMessage({ type: 'DASHBOARD_DATA', data }).catch(err => {
                console.error('Failed to send dashboard data:', err);
            });
        } catch (err) {
            console.error('Failed to scrape dashboard data:', err);
            chrome.runtime.sendMessage({
                type: 'ERROR',
                error: 'Failed to scrape dashboard data'
            }).catch(console.error);
        }
    }

    public scrapeDashboardData(): DashboardData[] {
        try {
            const dashboardData: DashboardData[] = [];
            const courseAssignments: { [courseName: string]: DashboardData['assignments'] } = {};
            
            // Find all planner items
            const plannerItems = document.querySelectorAll('.planner-item');
            plannerItems.forEach(item => {
                // Get course name
                const courseElement = item.querySelector('.course-title, .planner-course-title');
                const courseName = courseElement?.textContent?.trim() || 'Unknown Course';
                
                // Get assignment details
                const assignmentElement = item.querySelector('.planner-item-details');
                if (assignmentElement) {
                    const name = item.querySelector('.planner-item-title')?.textContent?.trim() || '';
                    const typeElement = item.querySelector('.planner-item-type');
                    const type = typeElement?.textContent?.trim() ||
                                typeElement?.getAttribute('title')?.trim() ||
                                item.querySelector('.planner-item-type-icon')?.getAttribute('title')?.trim() || '';
                    
                    // Get due date
                    const dueDateElement = item.querySelector('.planner-item-due-date, .planner-item-time');
                    let dueDate = '';
                    
                    // Parse the due date
                    if (item.querySelector('.planner-item-time-all-day')) {
                        dueDate = 'All Day';
                    } else {
                        const dueDateText = dueDateElement?.textContent?.trim() || '';
                        if (dueDateText) {
                            dueDate = dueDateText;
                        } else {
                            dueDate = 'No due date';
                        }
                    }

                    if (name) {
                        if (!courseAssignments[courseName]) {
                            courseAssignments[courseName] = [];
                        }
                        courseAssignments[courseName].push({
                            name,
                            type,
                            dueDate: dueDate
                        });
                    }
                }
            });

            // Convert to DashboardData array
            Object.entries(courseAssignments).forEach(([courseName, assignments]) => {
                if (assignments.length > 0) {
                    dashboardData.push({ courseName, assignments });
                }
            });

            return dashboardData;
        } catch (err) {
            console.error('Error in scrapeDashboardData:', err);
            throw err;
        }
    }
}

export class GradeDataScraper {
    constructor() {
        this.initialize();
    }

    private initialize() {
        if (this.isGradesPage()) {
            try {
                const data = this.scrapeGradeData();
                chrome.runtime.sendMessage({ type: 'GRADE_DATA', data }).catch(err => {
                    console.error('Failed to send grade data:', err);
                });
            } catch (err) {
                console.error('Failed to scrape grade data:', err);
                chrome.runtime.sendMessage({ 
                    type: 'ERROR', 
                    error: 'Failed to scrape grade data' 
                }).catch(console.error);
            }
        }
    }

    private isGradesPage(): boolean {
        const pageTitle = document.querySelector('h1.ic-Action-header__Heading')?.textContent;
        const hasGradesInUrl = window.location.pathname.includes('/grades');
        const hasGradesTable = document.getElementById('grades_summary') !== null;
        const hasGradesHeader = document.querySelector('.student_grades') !== null;

        return !!(pageTitle?.includes('Grade') || hasGradesInUrl || hasGradesTable || hasGradesHeader);
    }

    public scrapeGradeData(): GradeData {
        try {
            const courseTitleSelectors = [
                '.course-title',
                'h2.course-title',
                '.course_name',
                '#course_name',
                '.context_title',
                'h1.ic-Action-header__Heading'
            ];

            let courseName = '';
            for (const selector of courseTitleSelectors) {
                const element = document.querySelector(selector);
                if (element?.textContent?.trim()) {
                    courseName = element.textContent.trim();
                    break;
                }
            }

            if (!courseName) {
                const breadcrumb = document.querySelector('.ic-app-crumbs__title');
                if (breadcrumb?.textContent) {
                    courseName = breadcrumb.textContent.trim();
                } else {
                    courseName = document.title.split(':')[0].trim();
                }
            }

            const assignments: GradeData['assignments'] = [];
            const assignmentRows = document.querySelectorAll('.student_assignment, .assignment_graded');

            assignmentRows.forEach(row => {
                const nameSelectors = ['.title a', '.title', '.assignment_name'];
                let name = '';
                for (const selector of nameSelectors) {
                    const element = row.querySelector(selector);
                    if (element?.textContent?.trim()) {
                        name = element.textContent.trim();
                        break;
                    }
                }

                const gradeText = row.querySelector('.grade, .score')?.textContent;
                const possibleText = row.querySelector('.points_possible, .total-points')?.textContent;
                const weightText = row.querySelector('.assignment_group .group_weight, .weight')?.textContent;
            
                const points = gradeText === '-' || gradeText === 'not a number' ? 0 : this.parseNumber(gradeText);
                const pointsPossible = possibleText === 'also not a number' ? 0 : this.parseNumber(possibleText);
                const weight = weightText ? this.parseNumber(weightText.replace('%', '')) : undefined;
            
                if (name) {
                    assignments.push({ name, points, pointsPossible, weight });
                }
            });
            
            return { courseName, assignments };
        } catch (err) {
            console.error('Error in scrapeGradeData:', err);
            throw err;
        }
    }

    private parseNumber(value: string | null | undefined): number {
        if (!value || value === '-' || value === 'not a number' || value === 'also not a number') return 0;
        const num = parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
    }
}

// Initialize scrapers
export const initializeScrapers = () => {
    // Check if we're on a Canvas page
    if (!document.querySelector('.ic-app')) {
        return;
    }

    // Initialize scrapers based on page type
    const isDashboard = document.querySelector('.dashboard-planner, .planner-container');
    const isGradesPage = document.querySelector('.student_grades, .gradebook-content');

    if (isDashboard) {
        console.log('Initializing dashboard scraper');
        new DashboardScraper();
    }
    if (isGradesPage) {
        console.log('Initializing grades scraper');
        new GradeDataScraper();
    }
};