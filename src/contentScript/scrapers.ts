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
            console.log('Initializing DashboardScraper');
            const data = this.scrapeDashboardData();
            console.log('Scraped dashboard data:', data);
            chrome.runtime.sendMessage({ type: 'DASHBOARD_DATA', data }).catch(err => {
                console.error('Failed to send dashboard data:', err);
            });
        } catch (err) {
            console.error('Failed to scrape dashboard data:', err);
        }
    }

    public scrapeDashboardData(): DashboardData[] {
        try {
            console.log('Starting dashboard data scraping');
            const dashboardData: DashboardData[] = [];
            const courseAssignments: { [courseName: string]: DashboardData['assignments'] } = {};
            
            // Find all planner items
            const plannerItems = document.querySelectorAll('.PlannerItem, .planner-item');
            console.log('Found planner items:', plannerItems.length);

            plannerItems.forEach(item => {
                // Get course name
                const courseElement = item.querySelector('.course-title, .planner-course-title, [data-testid="course-name"]');
                const courseName = courseElement?.textContent?.trim() || 'Unknown Course';
                
                // Get assignment details
                const assignmentElement = item.querySelector('.PlannerItem-details, .planner-item-details');
                if (assignmentElement) {
                    const nameElement = item.querySelector('.PlannerItem-title, .planner-item-title, [data-testid="assignment-title"]');
                    const name = nameElement?.textContent?.trim() || '';
                    
                    const typeElement = item.querySelector('.PlannerItem-type, .planner-item-type, [data-testid="assignment-type"]');
                    const type = typeElement?.textContent?.trim() || 'assignment';
                    
                    // Get due date
                    const dueDateElement = item.querySelector('.PlannerItem-time, .planner-item-time, [data-testid="due-date"]');
                    let dueDate = '';
                    
                    // Parse the due date
                    if (item.querySelector('.PlannerItem-time-all-day, .planner-item-time-all-day')) {
                        dueDate = 'All Day';
                    } else {
                        const dueDateText = dueDateElement?.textContent?.trim() || '';
                        if (dueDateText) {
                            dueDate = dueDateText;
                        } else {
                            dueDate = 'No due date';
                        }
                    }

                    console.log('Found assignment:', { courseName, name, type, dueDate });

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

            console.log('Final dashboard data:', dashboardData);
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
                console.log('Initializing GradeDataScraper');
                const data = this.scrapeGradeData();
                console.log('Scraped grade data:', data);
                chrome.runtime.sendMessage({ type: 'GRADE_DATA', data }).catch(err => {
                    console.error('Failed to send grade data:', err);
                });
            } catch (err) {
                console.error('Failed to scrape grade data:', err);
            }
        }
    }

    private isGradesPage(): boolean {
        const pageTitle = document.querySelector('h1.ic-Action-header__Heading')?.textContent;
        const hasGradesInUrl = window.location.pathname.includes('/grades');
        const hasGradesTable = document.getElementById('grades_summary') !== null;
        const hasGradesHeader = document.querySelector('.student_grades') !== null;

        const isGrades = !!(pageTitle?.includes('Grade') || hasGradesInUrl || hasGradesTable || hasGradesHeader);
        console.log('Is grades page:', isGrades);
        return isGrades;
    }

    public scrapeGradeData(): GradeData {
        try {
            console.log('Starting grade data scraping');
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

            console.log('Found course name:', courseName);

            const assignments: GradeData['assignments'] = [];
            const assignmentRows = document.querySelectorAll('.student_assignment, .assignment_graded, [data-testid="assignment-row"]');
            console.log('Found assignment rows:', assignmentRows.length);

            assignmentRows.forEach(row => {
                const nameSelectors = ['.title a', '.title', '.assignment_name', '[data-testid="assignment-name"]'];
                let name = '';
                for (const selector of nameSelectors) {
                    const element = row.querySelector(selector);
                    if (element?.textContent?.trim()) {
                        name = element.textContent.trim();
                        break;
                    }
                }

                const gradeText = row.querySelector('.grade, .score, [data-testid="grade-display"]')?.textContent;
                const possibleText = row.querySelector('.points_possible, .total-points, [data-testid="points-possible"]')?.textContent;
                const weightText = row.querySelector('.assignment_group .group_weight, .weight, [data-testid="group-weight"]')?.textContent;
            
                const points = gradeText === '-' || gradeText === 'not a number' ? 0 : this.parseNumber(gradeText);
                const pointsPossible = possibleText === 'also not a number' ? 0 : this.parseNumber(possibleText);
                const weight = weightText ? this.parseNumber(weightText.replace('%', '')) : undefined;
            
                if (name) {
                    console.log('Found assignment:', { name, points, pointsPossible, weight });
                    assignments.push({ name, points, pointsPossible, weight });
                }
            });
            
            const result = { courseName, assignments };
            console.log('Final grade data:', result);
            return result;
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
    console.log('Initializing scrapers');
    // Check if we're on a Canvas page
    if (!document.querySelector('.ic-app')) {
        console.log('Not on a Canvas page');
        return;
    }

    // Initialize scrapers based on page type
    const isDashboard = document.querySelector('.dashboard-planner, .planner-container, .PlannerApp');
    const isGradesPage = document.querySelector('.student_grades, .gradebook-content, #grades_summary');

    console.log('Page type:', { isDashboard, isGradesPage });

    if (isDashboard) {
        console.log('Initializing dashboard scraper');
        new DashboardScraper();
    }
    if (isGradesPage) {
        console.log('Initializing grades scraper');
        new GradeDataScraper();
    }
};