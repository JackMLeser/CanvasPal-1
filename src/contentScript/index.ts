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
        // Check if we're on a Canvas page
        if (document.querySelector('.ic-app')) {
            try {
                const data = this.scrapeDashboardData();
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({ type: 'dashboardData', data }).catch(err => {
                        console.error('Failed to send dashboard data:', err);
                    });
                }
            } catch (err) {
                console.error('Failed to scrape dashboard data:', err);
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({
                        type: 'error',
                        error: 'Failed to scrape dashboard data'
                    });
                }
            }
        }
    }

    public scrapeDashboardData(): DashboardData[] {
        try {
            const dashboardData: DashboardData[] = [];
            
            // Find all course sections
            const courseSections = document.querySelectorAll('.context_module');
            
            courseSections.forEach(section => {
                const courseName = section.querySelector('.name')?.textContent?.trim() || 'Unknown Course';
                const assignments: DashboardData['assignments'] = [];

                // Find all assignment items in this section
                const assignmentItems = section.querySelectorAll('.ig-row');
                assignmentItems.forEach(item => {
                    const name = item.querySelector('.ig-title')?.textContent?.trim() || '';
                    const type = item.querySelector('.type_icon')?.getAttribute('title') || '';
                    const dueDate = item.querySelector('.due_date_display')?.textContent?.trim() || '';

                    if (name) {
                        assignments.push({ name, type, dueDate });
                    }
                });

                if (assignments.length > 0) {
                    dashboardData.push({ courseName, assignments });
                }
            });

            console.log('Extracted dashboard data:', dashboardData);
            return dashboardData;
        } catch (err) {
            console.error('Error in scrapeDashboardData:', err);
            throw err;
        }
    }
}

export class GradeDataScraper {
    constructor() {
        // Check if we're on a grades page using multiple indicators
        const isGradesPage = this.isGradesPage();
        if (isGradesPage) {
            try {
                const data = this.scrapeGradeData();
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({ type: 'gradeData', data }).catch(err => {
                        console.error('Failed to send grade data:', err);
                    });
                }
            } catch (err) {
                console.error('Failed to scrape grade data:', err);
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    chrome.runtime.sendMessage({ 
                        type: 'error', 
                        error: 'Failed to scrape grade data' 
                    });
                }
            }
        }
    }

    private isGradesPage(): boolean {
        // Multiple ways to detect if we're on a grades page
        const pageTitle = document.querySelector('h1.ic-Action-header__Heading')?.textContent;
        const hasGradesInUrl = window.location.pathname.includes('/grades');
        const hasGradesTable = document.getElementById('grades_summary') !== null;
        const hasGradesHeader = document.querySelector('.student_grades') !== null;

        return !!(pageTitle?.includes('Grade') || hasGradesInUrl || hasGradesTable || hasGradesHeader);
    }

    public scrapeGradeData(): GradeData {
        try {
            // Try multiple selectors for course title
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
                // Try getting from breadcrumb or page title
                const breadcrumb = document.querySelector('.ic-app-crumbs__title');
                if (breadcrumb?.textContent) {
                    courseName = breadcrumb.textContent.trim();
                } else {
                    courseName = document.title.split(':')[0].trim();
                }
            }

            const assignments: GradeData['assignments'] = [];
            const assignmentRows = document.querySelectorAll('.student_assignment, .assignment_graded');

            if (assignmentRows.length === 0) {
                console.warn('No assignment rows found');
            }

            console.log('Found', assignmentRows.length, 'assignment rows');
        
            // Process each assignment row
            assignmentRows.forEach(row => {
                // Try multiple selectors for assignment name
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
            
                // Handle special cases
                const points = gradeText === '-' || gradeText === 'not a number' ? 0 : this.parseNumber(gradeText);
                const pointsPossible = possibleText === 'also not a number' ? 0 : this.parseNumber(possibleText);
                const weight = weightText ? this.parseNumber(weightText.replace('%', '')) : undefined;
            
                if (name) {
                    assignments.push({ name, points, pointsPossible, weight });
                }
            });
            
            console.log('Extracted assignments:', assignments);
            
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

// Initialize scrapers based on page content rather than just URL
const initializeScrapers = () => {
    // Check if we're on a Canvas page
    if (!document.querySelector('.ic-app')) {
        return;
    }

    // Initialize grade scraper if we detect grade elements
    const gradeScraperInstance = new GradeDataScraper();

    // Initialize dashboard scraper if we detect dashboard elements
    if (document.querySelector('.ic-Dashboard-header, .context_module')) {
        new DashboardScraper();
    }
};

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScrapers);
} else {
    initializeScrapers();
}
