interface Assignment {
    title: string;
    dueDate: string;
    courseName: string;
    type: string;
    points: number;
    maxPoints?: number;
    weight?: number;
    priorityScore: number;
}
declare let assignments: Assignment[];
declare function calculatePriorityScore(assignment: Assignment): number;
declare function processAssignments(newAssignments: Assignment[]): void;
