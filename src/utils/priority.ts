interface PriorityWeights {
    dueDate: number;
    gradeWeight: number;
    gradeImpact: number;
}

export function calculatePriorityScore(assignment: {
    dueDate: string;
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}, weights: PriorityWeights): number {
    const dueDateFactor = calculateDueDateFactor(assignment.dueDate);
    const gradeWeightFactor = calculateGradeWeightFactor(assignment.gradeWeight);
    const impactFactor = calculateImpactFactor(assignment.pointsPossible, assignment.currentScore);

    return (dueDateFactor * weights.dueDate) +
           (gradeWeightFactor * weights.gradeWeight) +
           (impactFactor * weights.gradeImpact);
}

function calculateDueDateFactor(dueDate: string): number {
    // Handle special cases
    if (dueDate === 'All Day') {
        return 1; // Due today, highest priority
    }
    if (dueDate === 'No due date') {
        return 0.5; // Medium priority for no due date
    }

    // Extract date from "Due: " format if present
    const dateStr = dueDate.startsWith('Due: ') ? dueDate.substring(5) : dueDate;
    
    try {
        const dueDateObj = new Date(dateStr);
        // Check if date parsing was successful
        if (!isNaN(dueDateObj.getTime())) {
            const now = new Date();
            const timeRemaining = dueDateObj.getTime() - now.getTime();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            return Math.max(0, Math.min(1, 1 - (timeRemaining / oneWeek)));
        }
        // Return medium priority if parsing fails
        return 0.5;
    } catch {
        // Return medium priority if parsing fails
        return 0.5;
    }
}

function calculateGradeWeightFactor(weight?: number): number {
    return weight ? weight / 100 : 0.5;
}

function calculateImpactFactor(pointsPossible?: number, currentScore?: number): number {
    if (!pointsPossible || currentScore === undefined) return 0.5;
    return (pointsPossible * (1 - (currentScore / pointsPossible))) / 100;
}
