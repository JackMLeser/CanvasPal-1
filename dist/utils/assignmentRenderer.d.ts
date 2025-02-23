import { Assignment } from '../types/models';
export declare class AssignmentRenderer {
    private logger;
    constructor();
    renderAssignment(assignment: Assignment): HTMLElement;
    private getAssignmentClasses;
    private formatDueDate;
    private renderPointsDisplay;
    private renderAdditionalDetails;
    private escapeHtml;
    private capitalizeFirstLetter;
}
