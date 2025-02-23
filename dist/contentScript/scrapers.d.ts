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
export declare class DashboardScraper {
    constructor();
    private initialize;
    scrapeDashboardData(): DashboardData[];
}
export declare class GradeDataScraper {
    constructor();
    private initialize;
    private isGradesPage;
    scrapeGradeData(): GradeData;
    private parseNumber;
}
export declare const initializeScrapers: () => void;
