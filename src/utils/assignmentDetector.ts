import { Assignment, AssignmentType, AssignmentDetails } from '../types/models';
import { Logger, LogLevel } from '../utils/logger';
import { DebugPanel } from './debugPanel';
import { DateDebugger } from './dateDebugger';
import { PerformanceMonitor } from './performanceMonitor';
import { PriorityCalculator } from './priorityCalculator';

export class AssignmentDetector {
    private logger: Logger;
    private debugPanel: DebugPanel;
    private dateDebugger: DateDebugger;
    private performanceMonitor: PerformanceMonitor;
    private debugManager: { isDebugEnabled(): boolean };
    private priorityCalculator: PriorityCalculator;

    constructor() {
        // Create debug manager
        this.debugManager = {
            isDebugEnabled: () => true // Always enable debug for development
        };

        this.logger = new Logger('AssignmentDetector', LogLevel.INFO);
        try {
          this.debugPanel = new DebugPanel(this.debugManager);
          this.dateDebugger = new DateDebugger();
          this.performanceMonitor = PerformanceMonitor.getInstance();
          this.priorityCalculator = new PriorityCalculator();
        } catch (error) {
          console.error("Error initializing debug tools: ", error);
          // Provide fallback implementations to prevent crashes
          this.debugPanel = { logDetectionEvent: () => {} } as any;
          this.dateDebugger = { highlightDates: async () => [] } as any;
          this.performanceMonitor = { monitorAsync: async (name: string, fn: () => Promise<any>) => fn() } as any;
          this.priorityCalculator = new PriorityCalculator();
        }
    }

    public async detectAssignments(): Promise<Assignment[]> {
        return this.performanceMonitor.monitorAsync('detectAssignments', async () => {
            try {
                // Check if we're on a Canvas page
                if (!window.location.hostname.includes('instructure.com')) {
                    this.logger.info('Not on a Canvas page, skipping assignment detection');
                    return [];
                }

                this.logger.info('Starting assignment detection');
                this.debugPanel.logDetectionEvent('Starting assignment detection');
                
                // Monitor date detection
                const dateMatches = await this.performanceMonitor.monitorAsync('dateDetection',
                    async () => this.dateDebugger.highlightDates(),
                    { totalElements: document.querySelectorAll('[class*="date"]').length }
                );

                this.debugPanel.logDetectionEvent('Date detection complete', {
                    totalDates: dateMatches.length,
                    dueDates: dateMatches.filter(m => m.type === 'due').length,
                    performance: this.performanceMonitor.getReport()
                });

                let allAssignments: Assignment[] = [];

                try {
                    // Monitor API fetches in parallel
                    const [plannerItems, missingSubmissions, dashboardItems] = await Promise.all([
                        this.performanceMonitor.monitorAsync('fetchPlannerItems',
                            () => this.fetchPlannerItems()),
                        this.performanceMonitor.monitorAsync('fetchMissingSubmissions',
                            () => this.fetchMissingSubmissions()),
                        this.performanceMonitor.monitorAsync('parseDashboardCards',
                            () => this.parseDashboardCards())
                    ]);

                    this.logger.info(`Retrieved: ${plannerItems.length} planner items, ${missingSubmissions.length} missing submissions, ${dashboardItems.length} dashboard items`);

                    // Combine and filter assignments
                    allAssignments = [...plannerItems, ...missingSubmissions, ...dashboardItems]
                        .filter(assignment => this.isValidAssignment(assignment));

                    // Sort assignments by priority score (highest first)
                    allAssignments.sort((a, b) => b.priorityScore - a.priorityScore);

                    this.logger.info(`Total valid assignments found: ${allAssignments.length}`);
                    this.debugPanel.logDetectionEvent('Assignments sorted by priority:',
                        allAssignments.map(a => ({
                            title: a.title,
                            dueDate: a.dueDate,
                            priority: a.priorityScore
                        }))
                    );
                } catch (error) {
                    this.logger.error('Error fetching assignments:', error);
                    return [];
                }

                // Monitor date validation
                await this.performanceMonitor.monitorAsync('validateDates',
                    async () => this.validateAssignmentDates(allAssignments, dateMatches),
                    { assignmentCount: allAssignments.length }
                );

                const performanceReport = this.performanceMonitor.getReport();
                this.debugPanel.logDetectionEvent('Assignment detection complete', {
                    totalAssignments: allAssignments.length,
                    performance: performanceReport
                });

                return allAssignments;
            } catch (error) {
                this.logger.error('Error detecting assignments:', error);
                return [];
            }
        });
    }

    private async validateAssignmentDates(assignments: Assignment[], dateMatches: any[]): Promise<void> {
        return this.performanceMonitor.monitorAsync('validateAssignmentDates', async () => {
            assignments.forEach(assignment => {
                const matchingDateElements = dateMatches.filter(match => {
                    try {
                        const matchDate = new Date(match.date).getTime();
                        const assignmentDate = new Date(assignment.dueDate).getTime();
                        return Math.abs(matchDate - assignmentDate) < 24 * 60 * 60 * 1000;
                    } catch {
                        return false;
                    }
                });

                if (matchingDateElements.length > 0) {
                    this.debugPanel.logDetectionEvent('Date validation:', {
                        assignment: assignment.title,
                        dueDate: assignment.dueDate,
                        matchingElements: matchingDateElements.length
                    });
                }
            });
        }, { assignmentCount: assignments.length, dateMatchCount: dateMatches.length });
    }

    private async fetchPlannerItems(): Promise<Assignment[]> {
        try {
            const baseUrl = window.location.origin;
            this.logger.info(`Fetching planner items from ${baseUrl}`);
            
            const response = await fetch(`${baseUrl}/api/v1/planner/items?per_page=50`, {
                headers: {
                    'Accept': 'application/json+canvas-string-ids, application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                this.logger.error(`HTTP error fetching planner items! status: ${response.status}`);
                const errorText = await response.text();
                this.logger.error(`Error details: ${errorText}`);
                return [];
            }
            
            const items = await response.json();
            this.debugPanel.logDetectionEvent('Planner items retrieved:', items);
            this.logger.info(`Retrieved ${items.length} planner items`);

            return items.map((item: any) => {
                try {
                    const assignment = this.convertPlannerItem(item);
                    if (assignment) {
                        this.debugPanel.logDetectionEvent('Processed planner item:', {
                            title: assignment.title,
                            type: assignment.type,
                            dueDate: assignment.dueDate
                        });
                        return assignment;
                    }
                    return null;
                } catch (error) {
                    this.logger.error('Error processing planner item:', error);
                    return null;
                }
            }).filter((item: Assignment | null): item is Assignment => item !== null);
        } catch (error) {
            this.logger.error('Error fetching planner items:', error);
            return [];
        }
    }

    private async fetchMissingSubmissions(): Promise<Assignment[]> {
        try {
            const baseUrl = window.location.origin;
            this.logger.info(`Fetching missing submissions from ${baseUrl}`);
            
            const response = await fetch(`${baseUrl}/api/v1/users/self/missing_submissions?include[]=planner_overrides`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                this.logger.error(`HTTP error fetching missing submissions! status: ${response.status}`);
                const errorText = await response.text();
                this.logger.error(`Error details: ${errorText}`);
                return [];
            }
            
            const submissions = await response.json();
            this.logger.info(`Retrieved ${submissions.length} missing submissions`);
            return submissions.map((submission: any) => {
                try {
                    return this.convertMissingSubmission(submission);
                } catch (error) {
                    this.logger.error('Error processing missing submission:', error);
                    return null;
                }
            })
                .filter((item: Assignment | null): item is Assignment => item !== null) as Assignment[];
        } catch (error) {
            this.logger.error('Error fetching missing submissions:', error);
            return [];
        }
    }

    private async parseDashboardCards(): Promise<Assignment[]> {
        try {
            // Check if we're on a Canvas page
            if (!window.location.hostname.includes('instructure.com')) {
                this.logger.info('Not on a Canvas page, skipping dashboard cards fetch');
                return [];
            }

            const baseUrl = window.location.origin;
            this.logger.info(`Fetching dashboard cards from ${baseUrl}`);
            
            // First get the dashboard cards
            const cardsResponse = await fetch(`${baseUrl}/api/v1/dashboard/dashboard_cards`, {
                headers: {
                    'Accept': 'application/json+canvas-string-ids, application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!cardsResponse.ok) {
                this.logger.error(`HTTP error fetching dashboard cards! status: ${cardsResponse.status}`);
                const errorText = await cardsResponse.text();
                this.logger.error(`Error details: ${errorText}`);
                return [];
            }
            
            const cards = await cardsResponse.json();
            this.logger.info(`Retrieved ${cards?.length || 0} dashboard cards`);

            // Then get the activity stream items which contain more recent assignments
            const streamResponse = await fetch(`${baseUrl}/api/v1/users/self/activity_stream?only_active_courses=true`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (!streamResponse.ok) {
                this.logger.error(`HTTP error fetching activity stream! status: ${streamResponse.status}`);
                return [];
            }

            const streamItems = await streamResponse.json();
            this.logger.info(`Retrieved ${streamItems?.length || 0} activity stream items`);

            const assignments: Assignment[] = [];

            // Process dashboard cards
            if (cards) {
                for (const card of cards) {
                    this.logger.info(`Processing card: ${card.shortName || card.courseName}`);
                    
                    // Get assignments from the card's upcoming_assignments
                    if (card.upcoming_assignments) {
                        this.logger.info(`Card has ${card.upcoming_assignments.length} upcoming assignments`);
                        for (const assignment of card.upcoming_assignments) {
                            try {
                                const converted = this.convertDashboardAssignment(assignment, card);
                                if (converted) {
                                    this.logger.info(`Processed upcoming assignment: ${converted.title} for course ${converted.course}`);
                                    assignments.push(converted);
                                }
                            } catch (error) {
                                this.logger.error('Error processing upcoming assignment:', error);
                            }
                        }
                    }

                    // Get assignments from the card's published_grades
                    if (card.published_grades) {
                        this.logger.info(`Card has ${card.published_grades.length} published grades`);
                        for (const grade of card.published_grades) {
                            try {
                                if (grade.assignment) {
                                    const converted = this.convertDashboardAssignment(grade.assignment, card);
                                    if (converted) {
                                        this.logger.info(`Processed graded assignment: ${converted.title} for course ${converted.course}`);
                                        assignments.push(converted);
                                    }
                                }
                            } catch (error) {
                                this.logger.error('Error processing graded assignment:', error);
                            }
                        }
                    }
                }
            }

            // Process activity stream items
            if (streamItems) {
                for (const item of streamItems) {
                    if (item.type === 'Assignment' || item.type === 'Submission') {
                        try {
                            const assignment = item.assignment || item;
                            const converted = this.convertDashboardAssignment(assignment, {
                                shortName: item.context_name || item.course_name,
                                id: item.course_id,
                                contextCode: item.context_code
                            });
                            if (converted) {
                                this.logger.info(`Processed stream assignment: ${converted.title} for course ${converted.course}`);
                                assignments.push(converted);
                            }
                        } catch (error) {
                            this.logger.error('Error processing stream assignment:', error);
                        }
                    }
                }
            }

            // Also try to get assignments from the todo list
            try {
                const todoResponse = await fetch(`${baseUrl}/api/v1/users/self/todo`, {
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include'
                });

                if (todoResponse.ok) {
                    const todoItems = await todoResponse.json();
                    this.logger.info(`Retrieved ${todoItems?.length || 0} todo items`);

                    for (const item of todoItems) {
                        try {
                            if (item.assignment) {
                                const converted = this.convertDashboardAssignment(item.assignment, {
                                    shortName: item.context_name,
                                    id: item.course_id,
                                    contextCode: item.context_type
                                });
                                if (converted) {
                                    this.logger.info(`Processed todo assignment: ${converted.title} for course ${converted.course}`);
                                    assignments.push(converted);
                                }
                            }
                        } catch (error) {
                            this.logger.error('Error processing todo assignment:', error);
                        }
                    }
                }
            } catch (error) {
                this.logger.error('Error fetching todo items:', error);
            }

            this.logger.info(`Total assignments found from dashboard: ${assignments.length}`);
            return assignments;
        } catch (error) {
            this.logger.error('Error parsing dashboard cards:', error);
            return [];
        }
    }

    private convertPlannerItem(item: any): Assignment | null {
        if (!item.plannable || !item.plannable_type) return null;

        const type = this.determineAssignmentType(item.plannable_type);
        if (!type || !item.plannable_date) return null;

        // Try to get course name from various sources
        let courseName = '';
        if (item.context_name) {
            courseName = item.context_name;
        } else if (item.context?.name) {
            courseName = item.context.name;
        } else if (item.plannable?.context_name) {
            courseName = item.plannable.context_name;
        }

        // If we still don't have a course name, try to extract from context_type
        if (!courseName && item.context_type === 'Course' && item.course_id) {
            courseName = `Course ${item.course_id}`;
        }

        // Ensure the assignment isn't too old
        const dueDate = new Date(item.plannable_date);
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        if (dueDate < threeMonthsAgo) {
            this.logger.info(`Skipping old planner item: ${item.plannable?.title}, due: ${item.plannable_date}`);
            return null;
        }

        this.logger.info(`Converting planner item: ${item.plannable?.title}, course: ${courseName}`);

        const result: Assignment = {
            id: item.plannable_id.toString(),
            title: item.plannable?.title || item.plannable?.name || '',
            dueDate: item.plannable_date,
            course: courseName,
            courseId: item.course_id?.toString(),
            type,
            points: item.plannable?.points_possible || item.plannable?.scoring_range?.points_possible || 0,
            maxPoints: item.plannable?.points_possible || item.plannable?.scoring_range?.points_possible || 0,
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

        // Calculate priority score
        result.priorityScore = this.priorityCalculator.calculatePriority({
            ...result,
            courseGrade: item.plannable?.score ? item.plannable.score / result.maxPoints : undefined
        });

        return result;
    }

    private convertMissingSubmission(submission: any): Assignment | null {
        if (!submission.due_at) return null;

        // Ensure the submission isn't too old
        const dueDate = new Date(submission.due_at);
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        if (dueDate < threeMonthsAgo) {
            this.logger.info(`Skipping old missing submission: ${submission.name}, due: ${submission.due_at}`);
            return null;
        }

        // Try to get course name from various sources
        let courseName = '';
        if (submission.course?.name) {
            courseName = submission.course.name;
        } else if (submission.context_name) {
            courseName = submission.context_name;
        } else if (submission.assignment?.course?.name) {
            courseName = submission.assignment.course.name;
        }

        // If we still don't have a course name, try to extract from course_id
        if (!courseName && submission.course_id) {
            courseName = `Course ${submission.course_id}`;
        }

        this.logger.info(`Converting missing submission: ${submission.name}, course: ${courseName}`);

        const result: Assignment = {
            id: submission.id.toString(),
            title: submission.name || submission.assignment?.name || '',
            dueDate: submission.due_at,
            course: courseName,
            courseId: submission.course_id?.toString(),
            type: 'assignment',
            points: submission.points_possible || submission.assignment?.points_possible || 0,
            maxPoints: submission.points_possible || submission.assignment?.points_possible || 0,
            completed: false,
            priorityScore: 0,
            url: submission.html_url,
            details: {
                isCompleted: false,
                isLocked: false,
                submissionType: submission.submission_types,
                description: submission.description || submission.assignment?.description
            }
        };

        // Calculate priority score - missing submissions get a courseGrade of 0 to increase priority
        result.priorityScore = this.priorityCalculator.calculatePriority({
            ...result,
            courseGrade: 0 // Missing submission means no grade, which should increase priority
        });

        return result;
    }

    private convertDashboardAssignment(assignment: any, card: any): Assignment | null {
        try {
            // Check if this is a valid assignment with a due date
            if (!assignment || (!assignment.due_at && !assignment.due_date)) {
                return null;
            }

            const dueDate = assignment.due_at || assignment.due_date;
            
            // Filter out old assignments
            const now = new Date();
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(now.getDate() - 7);
            
            const assignmentDate = new Date(dueDate);
            if (assignmentDate < oneWeekAgo) {
                this.logger.info(`Skipping old dashboard assignment: ${assignment.name || assignment.title}, due: ${dueDate}`);
                return null;
            }

            const type = this.determineAssignmentType(assignment.type || assignment.submission_types?.[0] || 'assignment');
            
            // Try to get course name from various sources
            let courseName = '';
            if (card.shortName) {
                courseName = card.shortName;
            } else if (card.courseName) {
                courseName = card.courseName;
            } else if (card.contextName) {
                courseName = card.contextName;
            } else if (assignment.contextName) {
                courseName = assignment.contextName;
            } else if (assignment.course_name) {
                courseName = assignment.course_name;
            }

            // If we still don't have a course name, try to extract from context_code or URL
            if (!courseName) {
                if (card.contextCode) {
                    const contextMatch = card.contextCode.match(/course_(\d+)/i);
                    if (contextMatch) {
                        courseName = `Course ${contextMatch[1]}`;
                    }
                } else if (assignment.html_url) {
                    const urlMatch = assignment.html_url.match(/courses\/(\d+)/);
                    if (urlMatch) {
                        courseName = `Course ${urlMatch[1]}`;
                    }
                }
            }

            // Extract points from various sources
            let points = 0;
            
            // First try direct points_possible
            if (assignment.points_possible !== undefined && assignment.points_possible !== null) {
                points = parseFloat(assignment.points_possible);
            }
            
            // Then try assignment details
            if (points === 0 && assignment.assignment) {
                if (assignment.assignment.points_possible !== undefined && assignment.assignment.points_possible !== null) {
                    points = parseFloat(assignment.assignment.points_possible);
                }
            }
            
            // Try score or grade
            if (points === 0) {
                if (assignment.score !== undefined && assignment.score !== null) {
                    points = parseFloat(assignment.score);
                } else if (assignment.grade !== undefined && assignment.grade !== null) {
                    const numericGrade = parseFloat(assignment.grade);
                    if (!isNaN(numericGrade)) {
                        points = numericGrade;
                    }
                }
            }

            // Try todo item points
            if (points === 0 && assignment.todo) {
                if (assignment.todo.points_possible !== undefined && assignment.todo.points_possible !== null) {
                    points = parseFloat(assignment.todo.points_possible);
                }
            }

            // Try grading details
            if (points === 0 && assignment.grading) {
                if (assignment.grading.points_possible !== undefined && assignment.grading.points_possible !== null) {
                    points = parseFloat(assignment.grading.points_possible);
                }
            }

            this.logger.info(`Points for ${assignment.name || assignment.title}: ${points} (from ${Object.keys({
                direct: assignment.points_possible,
                assignment: assignment.assignment?.points_possible,
                score: assignment.score,
                grade: assignment.grade,
                todo: assignment.todo?.points_possible,
                grading: assignment.grading?.points_possible
            }).find(key => assignment[key]?.points_possible !== undefined || assignment[key] !== undefined) || 'unknown'})`);

            // Determine completion status
            const completed = !!assignment.has_submitted_submissions ||
                             !!assignment.submitted ||
                             !!assignment.submission?.submitted ||
                             assignment.submission?.workflow_state === 'submitted';

            this.logger.info(`Converting dashboard assignment: ${assignment.name || assignment.title}, course: ${courseName}, due: ${dueDate}`);
            
            const result: Assignment = {
                id: assignment.id?.toString() || `${courseName}-${assignment.name}-${dueDate}`,
                title: assignment.name || assignment.title || '',
                dueDate: dueDate,
                course: courseName,
                courseId: card.id?.toString() || assignment.course_id?.toString(),
                type,
                points: points,
                maxPoints: points,
                completed: completed,
                url: assignment.html_url || assignment.url,
                priorityScore: 0, // Default value before calculation
                details: {
                    submissionType: assignment.submission_types || [type],
                    isCompleted: completed,
                    isLocked: !!assignment.locked_for_user || !!assignment.locked,
                    description: assignment.description || assignment.body
                }
            };

            // Calculate and update priority score
            result.priorityScore = this.priorityCalculator.calculatePriority({
                ...result,
                courseGrade: assignment.score ? assignment.score / points : undefined
            });

            this.logger.info(`Assignment points: ${result.points}, maxPoints: ${result.maxPoints}, priority: ${result.priorityScore}`);
            return result;
        } catch (error) {
            this.logger.error('Error converting dashboard assignment:', error);
            return null;
        }
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
        if (!assignment) return false;
        
        // Check required fields
        if (!assignment.title || !assignment.dueDate) {
            this.logger.info(`Invalid assignment - missing title or due date: ${assignment?.title}`);
            return false;
        }
        
        // Filter out old assignments and far future assignments
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        
        // Show assignments from up to 1 week ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        
        // And up to 3 months in the future
        const threeMonthsFuture = new Date();
        threeMonthsFuture.setMonth(now.getMonth() + 3);
        
        if (dueDate < oneWeekAgo) {
            this.logger.info(`Filtering out old assignment: ${assignment.title}, due: ${assignment.dueDate}`);
            return false;
        }
        
        if (dueDate > threeMonthsFuture) {
            this.logger.info(`Filtering out far future assignment: ${assignment.title}, due: ${assignment.dueDate}`);
            return false;
        }

        // Ensure course name is set
        if (!assignment.course || assignment.course === 'undefined') {
            // Try to extract course name from title
            const courseMatch = assignment.title.match(/^([A-Z]{2,4}\s*\d{4})/);
            if (courseMatch) {
                assignment.course = courseMatch[1];
                this.logger.info(`Extracted course name from title: ${assignment.course}`);
            } else if (assignment.courseId) {
                assignment.course = `Course ${assignment.courseId}`;
                this.logger.info(`Using course ID as name: ${assignment.course}`);
            } else {
                // Try to extract from URL
                const urlMatch = assignment.url?.match(/\/courses\/(\d+)/);
                if (urlMatch) {
                    assignment.course = `Course ${urlMatch[1]}`;
                    this.logger.info(`Extracted course from URL: ${assignment.course}`);
                } else {
                    this.logger.warn(`Missing course name for assignment: ${assignment.title}`);
                    assignment.course = 'Unknown Course';
                }
            }
        }

        this.logger.info(`Valid assignment found: ${assignment.title} for ${assignment.course}, due: ${assignment.dueDate}`);
        return true;
    }
}