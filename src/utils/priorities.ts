import type { CalendarEvent, PrioritySettings } from '../types/models';

export interface EnrichedEvent extends CalendarEvent {
    dueDate: string;  // Make dueDate required for EnrichedEvent
    gradeWeight?: number;
    pointsPossible?: number;
    currentScore?: number;
}

function isValidEvent(event: EnrichedEvent): event is EnrichedEvent & { dueDate: string } {
    if (event.dueDate === 'All Day' || event.dueDate === 'No due date') {
        return false;
    }
    // Extract date from "Due: " format if present
    const dateStr = event.dueDate.startsWith('Due: ') ?
        event.dueDate.substring(5) : event.dueDate;
    
    try {
        const dueDateObj = new Date(dateStr);
        return !isNaN(dueDateObj.getTime());
    } catch {
        return false;
    }
}

const normalize = (weights: PrioritySettings): PrioritySettings => {
    const total = weights.dueDateWeight + weights.gradeWeight + weights.difficultyWeight;
    return {
        dueDateWeight: weights.dueDateWeight / total,
        gradeWeight: weights.gradeWeight / total,
        difficultyWeight: weights.difficultyWeight / total
    };
};

export const calculatePriority = (
    event: EnrichedEvent,
    settings: PrioritySettings
): number => {
    if (!isValidEvent(event)) {
        return 0; // Return lowest priority if no due date
    }

    const normalizedWeights = normalize(settings);
    
    // Due date factor (0 to 10, then normalized to 0-1)
    const dateStr = event.dueDate.startsWith('Due: ') ?
        event.dueDate.substring(5) : event.dueDate;
    const dueDateObj = new Date(dateStr);
    const daysUntilDue = (dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    let dueScore;
    if (daysUntilDue < 0) {
        // Overdue assignments get maximum priority
        dueScore = 10;
    } else if (daysUntilDue > 10) {
        // Assignments more than 10 days away get minimum priority
        dueScore = 0;
    } else {
        // Linear scale from 10 (due now) to 0 (due in 10 days)
        dueScore = 10 * (1 - (daysUntilDue / 10));
    }

    // Grade weight factor (0 to 1)
    let gradeScore;
    if (event.gradeWeight !== undefined) {
        gradeScore = event.gradeWeight / 100;
    } else {
        // Missing grade weights get a slightly below-middle priority
        gradeScore = 0.4;
    }

    // Grade impact factor (0 to 1)
    let impactScore = 0.5; // Default middle priority
    if (event.pointsPossible && event.currentScore !== undefined) {
        const currentPercent = (event.currentScore / event.pointsPossible) * 100;
        const potentialPoints = event.pointsPossible - event.currentScore;
        const maxPotentialPoints = event.pointsPossible;
        let impactMultiplier = 1;

        // Higher multiplier for lower grades
        if (currentPercent < 70) {
            impactMultiplier = 1.5;
        } else if (currentPercent < 80) {
            impactMultiplier = 1.2;
        }

        impactScore = Math.min(1, (potentialPoints / maxPotentialPoints) * impactMultiplier);
    }

    // Calculate final priority score
    const dueDateContribution = (dueScore / 10) * normalizedWeights.dueDateWeight;
    const gradeWeightContribution = gradeScore * normalizedWeights.gradeWeight;
    const impactContribution = impactScore * normalizedWeights.difficultyWeight;

    return dueDateContribution + gradeWeightContribution + impactContribution;
};

export type { PrioritySettings };
