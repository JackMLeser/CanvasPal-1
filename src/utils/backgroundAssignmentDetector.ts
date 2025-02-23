import { Assignment, AssignmentType } from '../types/models';
import { Logger } from './logger';

export class BackgroundAssignmentDetector {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BackgroundAssignmentDetector');
    }

    public async detectAssignments(): Promise<Assignment[]> {
        try {
            // Monitor API fetches in parallel
            const [plannerItems, missingSubmissions, dashboardItems] = await Promise.all([
                this.fetchPlannerItems(),
                this.fetchMissingSubmissions(),
                this.parseDashboardCards()
            ]);

            const allAssignments = [...plannerItems, ...missingSubmissions, ...dashboardItems]
                .filter(assignment => this.isValidAssignment(assignment));

            return allAssignments;
        } catch (error) {
            this.logger.error('Error detecting assignments:', error);
            return [];
        }
    }

    private async fetchFromContentScript(url: string, options: RequestInit = {}): Promise<any> {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
            throw new Error('No active tab found');
        }

        const response = await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'FETCH_REQUEST',
            url,
            options: {
                ...options,
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...options.headers
                }
            }
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to fetch data');
        }

        return response.data;
    }

    private async fetchPlannerItems(): Promise<Assignment[]> {
        try {
            const items = await this.fetchFromContentScript('/api/v1/planner/items?per_page=50');
            return items.map((item: any) => this.convertPlannerItem(item))
                .filter((item: Assignment | null): item is Assignment => item !== null);
        } catch (error) {
            this.logger.error('Error fetching planner items:', error);
            return [];
        }
    }

    private async fetchMissingSubmissions(): Promise<Assignment[]> {
        try {
            const submissions = await this.fetchFromContentScript('/api/v1/users/self/missing_submissions?include[]=planner_overrides');
            return submissions.map((submission: any) => this.convertMissingSubmission(submission))
                .filter((item: Assignment | null): item is Assignment => item !== null);
        } catch (error) {
            this.logger.error('Error fetching missing submissions:', error);
            return [];
        }
    }

    private async parseDashboardCards(): Promise<Assignment[]> {
        try {
            const cards = await this.fetchFromContentScript('/api/v1/dashboard/dashboard_cards');
            const assignments: Assignment[] = [];

            for (const card of cards) {
                if (card.assignments) {
                    const processed = card.assignments
                        .map((assignment: any) => this.convertDashboardAssignment(assignment, card))
                        .filter((item: Assignment | null): item is Assignment => item !== null);
                    assignments.push(...processed);
                }
            }

            return assignments;
        } catch (error) {
            this.logger.error('Error parsing dashboard cards:', error);
            return [];
        }
    }

    private convertPlannerItem(item: any): Assignment | null {
        if (!item.plannable || !item.plannable_type) return null;

        const type = this.determineAssignmentType(item.plannable_type);
        const dueDate = item.plannable_date || null;

        if (!type || !dueDate) return null;

        return {
            id: item.plannable_id.toString(),
            title: item.plannable?.title || item.plannable?.name || '',
            dueDate,
            course: item.context_name || '',
            courseId: item.course_id?.toString(),
            type,
            points: item.plannable?.points_possible,
            maxPoints: item.plannable?.points_possible,
            completed: !!item.planner_override?.marked_complete,
            priorityScore: 0,
            url: item.html_url,
            details: {
                submissionType: item.plannable?.submission_types,
                isCompleted: !!item.planner_override?.marked_complete,
                isLocked: !!item.plannable?.locked_for_user,
                description: item.plannable?.description
            }
        };
    }

    private convertMissingSubmission(submission: any): Assignment | null {
        if (!submission.due_at) return null;

        return {
            id: submission.id.toString(),
            title: submission.name || submission.assignment?.name || '',
            dueDate: submission.due_at,
            course: submission.course?.name || '',
            courseId: submission.course_id?.toString(),
            type: 'assignment',
            points: submission.points_possible,
            maxPoints: submission.points_possible,
            completed: false,
            priorityScore: 0,
            url: submission.html_url,
            details: {
                isCompleted: false,
                isLocked: false
            }
        };
    }

    private convertDashboardAssignment(assignment: any, card: any): Assignment | null {
        if (!assignment.due_at) return null;

        const type = this.determineAssignmentType(assignment.type);
        
        return {
            id: assignment.id.toString(),
            title: assignment.name || '',
            dueDate: assignment.due_at,
            course: card.shortName || '',
            courseId: card.id?.toString(),
            type,
            points: assignment.points_possible,
            maxPoints: assignment.points_possible,
            completed: !!assignment.has_submitted_submissions,
            priorityScore: 0,
            url: assignment.html_url,
            details: {
                submissionType: assignment.submission_types,
                isCompleted: !!assignment.has_submitted_submissions,
                isLocked: !!assignment.locked_for_user,
                description: assignment.description
            }
        };
    }

    private determineAssignmentType(type: string): AssignmentType {
        switch (type.toLowerCase()) {
            case 'quiz':
            case 'quizzes/quiz':
                return 'quiz';
            case 'discussion_topic':
                return 'discussion';
            case 'announcement':
                return 'announcement';
            default:
                return 'assignment';
        }
    }

    private isValidAssignment(assignment: Assignment | null): assignment is Assignment {
        return assignment !== null &&
            !!assignment.title &&
            !!assignment.dueDate &&
            !!assignment.course;
    }
}