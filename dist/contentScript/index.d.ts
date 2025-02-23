export interface GradeData {
    courseName: string;
    assignments: {
        name: string;
        points: number;
        pointsPossible: number;
        weight?: number;
    }[];
}
export declare class GradeDataScraper {
    constructor();
    scrapeGradeData(): GradeData;
    private parseNumber;
}
