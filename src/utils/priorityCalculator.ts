import { Assignment, PriorityWeights, PriorityDetails } from '../types/models';
import { Logger } from './logger';
import { DebugPanel } from './debugPanel';
import { PerformanceMonitor } from './performanceMonitor';

export class PriorityCalculator {
    private PRIORITY_WEIGHTS: PriorityWeights = {
        GRADE_IMPACT: 0.35,
        COURSE_GRADE: 0.25,
        DUE_DATE: 0.4  // Increased weight for due dates
    };

    private readonly TYPE_WEIGHTS = {
        exam: 1.4,     // Highest priority
        quiz: 1.2,     // High priority
        assignment: 1.0, // Standard weight
        discussion: 0.8, // Lower priority
        announcement: 0.5 // Lowest priority
    };

    private logger: Logger;
    private debugPanel: DebugPanel;
    private performanceMonitor: PerformanceMonitor;
    private debugManager: { isDebugEnabled(): boolean };

    constructor() {
        // Create debug manager
        this.debugManager = {
            isDebugEnabled: () => true // Always enable debug for development
        };

        this.logger = new Logger('PriorityCalculator');
        this.debugPanel = new DebugPanel(this.debugManager);
        this.performanceMonitor = PerformanceMonitor.getInstance();
    }

    public calculatePriority(assignment: Assignment): number {
        return this.performanceMonitor.monitor('calculatePriority', () => {
            try {
                const metrics = {
                    daysUntilDue: this.performanceMonitor.monitor('calculateDaysUntilDue', 
                        () => this.calculateDaysUntilDue(assignment.dueDate)),
                    gradeImpact: this.performanceMonitor.monitor('calculateGradeImpact', 
                        () => this.calculateGradeImpact(assignment)),
                    courseGradeImpact: this.performanceMonitor.monitor('calculateCourseGradeImpact', 
                        () => this.calculateCourseGradeImpact(assignment)),
                    typeWeight: this.performanceMonitor.monitor('getTypeWeight', 
                        () => this.getTypeWeight(assignment.type))
                };

                // Calculate individual components
                const components = this.performanceMonitor.monitor('calculateComponents', () => ({
                    gradeComponent: metrics.gradeImpact * this.PRIORITY_WEIGHTS.GRADE_IMPACT,
                    courseComponent: metrics.courseGradeImpact * this.PRIORITY_WEIGHTS.COURSE_GRADE,
                    dateComponent: this.calculateDueDatePriority(metrics.daysUntilDue) * this.PRIORITY_WEIGHTS.DUE_DATE
                }));

                // Generate priority details
                const priorityDetails: PriorityDetails = {
                    dueStatus: this.getDueStatus(metrics.daysUntilDue),
                    daysUntilDue: metrics.daysUntilDue,
                    pointsImpact: this.getPointsImpact(assignment.points),
                    typeImportance: this.getTypeImportance(assignment.type, assignment.title),
                    components: {
                        dueDateScore: components.dateComponent,
                        gradeImpactScore: components.gradeComponent,
                        typeScore: metrics.typeWeight
                    }
                };

                // Calculate final priority with enhanced weighting
                const finalPriority = this.performanceMonitor.monitor('calculateFinalPriority', () => {
                    let priority = components.gradeComponent + components.courseComponent + components.dateComponent;
                    
                    // Apply type weight using both type and title
                    priority *= this.getTypeWeight(assignment.type, assignment.title);
                    
                    // Additional boosts for critical assignments
                    if (metrics.daysUntilDue <= 0) {
                        priority *= 1.5; // 50% boost for overdue
                    } else if (metrics.daysUntilDue <= 1) {
                        priority *= 1.3; // 30% boost for due within 24 hours
                    }
                    
                    // Boost for high-point assignments
                    if (assignment.points >= 50) {
                        priority *= 1.2; // 20% boost for assignments worth 50+ points
                    }
                    
                    // Cap final priority between 0 and 1.5
                    return Math.min(Math.max(priority, 0), 1.5);
                });

                // Attach priority details to assignment
                assignment.priorityDetails = priorityDetails;

                // Log calculation details to debug panel
                this.debugPanel.logDetectionEvent('Priority calculation:', {
                    assignment: assignment.title,
                    components,
                    metrics,
                    finalPriority,
                    performance: this.performanceMonitor.getReport()
                });

                return finalPriority;
            } catch (error) {
                this.logger.error('Error calculating priority:', error);
                return 0;
            }
        }, { assignmentTitle: assignment.title });
    }

    private calculateDaysUntilDue(dueDate: string): number {
        // Handle special cases
        if (dueDate === 'All Day') {
            return 0; // Due today
        }
        if (dueDate === 'No due date') {
            return 14; // Default to 2 weeks
        }

        // Extract date from "Due: " format if present
        const dateStr = dueDate.startsWith('Due: ') ? dueDate.substring(5) : dueDate;
        
        try {
            const dueDateObj = new Date(dateStr);
            // Check if date parsing was successful
            if (!isNaN(dueDateObj.getTime())) {
                const now = new Date();
                const diffTime = dueDateObj.getTime() - now.getTime();
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            // Default to 2 weeks if parsing fails
            this.logger.warn('Invalid date format:', dueDate);
            return 14;
        } catch (error) {
            this.logger.error('Error calculating days until due:', error);
            return 14; // Default to 2 weeks on error
        }
    }

    private calculateDueDatePriority(daysUntilDue: number): number {
        if (daysUntilDue <= 0) return 1.5; // Overdue assignments get 150% priority
        if (daysUntilDue <= 1) return 1.2; // Due within 24 hours gets 120% priority
        if (daysUntilDue <= 3) return 1.0; // Due within 3 days gets full priority
        if (daysUntilDue >= 14) return 0.3; // Far future assignments get low priority
        return 1 - (daysUntilDue / 14); // Linear decrease in priority over 14 days
    }

    private calculateGradeImpact(assignment: Assignment): number {
        // If no points info available, use a moderate default based on type
        if (!assignment.points || !assignment.maxPoints) {
            switch (assignment.type) {
                case 'quiz':
                    return 0.7; // Quizzes typically important
                case 'exam':
                    return 0.9; // Exams very important
                default:
                    return 0.5;
            }
        }

        // Calculate base impact from points
        let impact = 0;
        
        // Scale based on point ranges
        if (assignment.points >= 100) impact = 1.0;        // 100+ points = max priority
        else if (assignment.points >= 50) impact = 0.9;    // 50-99 points = very high
        else if (assignment.points >= 20) impact = 0.7;    // 20-49 points = high
        else if (assignment.points >= 10) impact = 0.5;    // 10-19 points = medium
        else impact = 0.3;                                 // <10 points = lower

        // Adjust impact based on grade weight if available
        if (assignment.gradeWeight) {
            impact *= (1 + assignment.gradeWeight); // Weight increases impact
        }

        // Title-based adjustments
        const title = assignment.title.toLowerCase();
        if (title.includes('exam') || title.includes('final') || title.includes('midterm')) {
            impact *= 1.3; // 30% boost for exams
        } else if (title.includes('quiz')) {
            impact *= 1.1; // 10% boost for quizzes
        }

        // Cap final impact at 1.5
        return Math.min(impact, 1.5);
    }

    private calculateCourseGradeImpact(assignment: Assignment): number {
        if (!assignment.courseGrade) return 0.85; // Default if no course grade available
        return 1 - assignment.courseGrade; // Lower grades mean higher priority
    }

    private getTypeWeight(type: Assignment['type'], title: string = ''): number {
        // Check title for exam-related keywords
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('exam') ||
            lowerTitle.includes('final') ||
            lowerTitle.includes('midterm')) {
            return this.TYPE_WEIGHTS.exam;
        }

        // Check title for quiz if type is assignment
        if (type === 'assignment' && lowerTitle.includes('quiz')) {
            return this.TYPE_WEIGHTS.quiz;
        }

        // Use type-based weights
        switch (type) {
            case 'quiz':
                return this.TYPE_WEIGHTS.quiz;
            case 'assignment':
                return this.TYPE_WEIGHTS.assignment;
            case 'discussion':
                return this.TYPE_WEIGHTS.discussion;
            case 'announcement':
                return this.TYPE_WEIGHTS.announcement;
            default:
                return this.TYPE_WEIGHTS.assignment;
        }
    }

    private getDueStatus(daysUntilDue: number): PriorityDetails['dueStatus'] {
        if (daysUntilDue <= 0) return 'overdue';
        if (daysUntilDue <= 1) return 'due-soon';
        if (daysUntilDue <= 7) return 'upcoming';
        return 'far-future';
    }

    private getPointsImpact(points: number): PriorityDetails['pointsImpact'] {
        if (points >= 50) return 'high';
        if (points >= 20) return 'medium';
        return 'low';
    }

    private getTypeImportance(type: Assignment['type'], title: string): PriorityDetails['typeImportance'] {
        const lowerTitle = title.toLowerCase();
        
        // Check for exam-related keywords in title
        if (lowerTitle.includes('exam') ||
            lowerTitle.includes('final') ||
            lowerTitle.includes('midterm')) {
            return 'critical';
        }

        // Check for quiz in title if type is assignment
        if (type === 'assignment' && lowerTitle.includes('quiz')) {
            return 'high';
        }

        // Use type-based importance
        switch (type) {
            case 'quiz':
                return 'high';
            case 'assignment':
                return 'normal';
            case 'discussion':
                return 'low';
            case 'announcement':
                return 'low';
            default:
                return 'normal';
        }
    }

    public setPriorityWeights(weights: Partial<PriorityWeights>): void {
        const totalWeight = (weights.GRADE_IMPACT || this.PRIORITY_WEIGHTS.GRADE_IMPACT) +
                          (weights.COURSE_GRADE || this.PRIORITY_WEIGHTS.COURSE_GRADE) +
                          (weights.DUE_DATE || this.PRIORITY_WEIGHTS.DUE_DATE);

        if (Math.abs(totalWeight - 1) > 0.001) {
            this.logger.warn('Priority weights do not sum to 1. Using default weights.');
            return;
        }

        Object.assign(this.PRIORITY_WEIGHTS, weights);
        this.logger.info('Priority weights updated:', this.PRIORITY_WEIGHTS);
        this.debugPanel.logDetectionEvent('Priority weights updated:', this.PRIORITY_WEIGHTS);
    }
}
