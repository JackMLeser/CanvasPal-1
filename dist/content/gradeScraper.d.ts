interface GradeData {
    courseName: string;
    assignments: Array<{
        name: string;
        points: number;
        pointsPossible: number;
        weight: number;
    }>;
}
declare function scrapeGrades(): GradeData | null;
declare function initializeScraper(): void;
