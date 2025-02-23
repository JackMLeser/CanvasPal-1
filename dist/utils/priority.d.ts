interface PriorityWeights {
    dueDate: number;
    gradeWeight: number;
    gradeImpact: number;
}
export declare function calculatePriorityScore(assignment: {
    dueDate: string;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}, weights: PriorityWeights): number;
export {};
