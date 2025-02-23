interface GradeData {
    courseName: string;
    assignments: Array<{
        name: string;
        points: number;
        pointsPossible: number;
        weight: number;
    }>;
}

function scrapeGrades(): GradeData | null {
    try {
        console.log('CanvasPal: Starting grade scraping...');
        
        const courseElement = document.querySelector('.course-title');
        const gradeTable = document.querySelector('.student_assignments');
        
        if (!courseElement) {
            console.warn('CanvasPal: Course title element not found');
            return null;
        }
        
        if (!gradeTable) {
            console.warn('CanvasPal: Grade table not found');
            return null;
        }

        const courseName = courseElement.textContent?.trim() || 'Unknown Course';
        console.log('CanvasPal: Found course:', courseName);
        
        const rows = gradeTable.querySelectorAll('tr.student_assignment');
        console.log('CanvasPal: Found', rows.length, 'assignments');
        
        const assignments = Array.from(rows).map(row => ({
            name: row.querySelector('.assignment_name')?.textContent?.trim() || 'Unknown Assignment',
            points: parseFloat(row.querySelector('.grade')?.textContent?.trim() || '0'),
            pointsPossible: parseFloat(row.querySelector('.points_possible')?.textContent?.trim() || '0'),
            weight: parseFloat(row.querySelector('.assignment_weight')?.textContent?.trim() || '0')
        }));

        const data = { courseName, assignments };
        console.log('CanvasPal: Successfully scraped data:', data);
        return data;
    } catch (error) {
        console.error('CanvasPal: Error scraping grades:', error);
        return null;
    }
}

// Execute after DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScraper);
} else {
    initializeScraper();
}

function initializeScraper() {
    console.log('CanvasPal: Initializing grade scraper...');
    const gradeData = scrapeGrades();
    
    if (gradeData) {
        console.log('CanvasPal: Sending grade data to background service...');
        chrome.runtime.sendMessage({
            type: 'GRADE_DATA',
            data: gradeData
        }).then(() => {
            console.log('CanvasPal: Grade data sent successfully');
        }).catch(error => {
            console.error('CanvasPal: Failed to send grade data:', error);
        });
    } else {
        console.warn('CanvasPal: No grade data found to send');
    }
}
