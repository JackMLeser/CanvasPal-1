describe('AssignmentPrioritizer', () => {
  let prioritizer;
  
  // Mock fetch API
  global.fetch = jest.fn();
  
  // Mock DOM elements and functions
  document.querySelector = jest.fn();
  document.querySelectorAll = jest.fn();
  
  beforeEach(() => {
    prioritizer = new AssignmentPrioritizer();
    jest.clearAllMocks();
  });

  describe('fetchPlannerItems', () => {
    const mockPlannerItems = [
      {
        plannable_type: 'quiz',
        plannable: {
          title: 'Test Quiz',
          points_possible: 100
        },
        plannable_date: '2024-03-20T23:59:59Z',
        context_name: 'Test Course',
        html_url: 'http://test.com/quiz',
        plannable_id: '123'
      },
      {
        plannable_type: 'assignment',
        plannable: {
          title: 'Test Assignment',
          points_possible: 50
        },
        plannable_date: '2024-03-21T23:59:59Z',
        context_name: 'Test Course',
        html_url: 'http://test.com/assignment',
        plannable_id: '456'
      }
    ];

    it('should fetch and parse planner items correctly', async () => {
      // Mock fetch response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlannerItems)
      });

      const result = await prioritizer.fetchPlannerItems();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        title: 'Test Quiz',
        type: 'quiz',
        weight: 0.3,
        points: 100
      });
      expect(result[1]).toMatchObject({
        title: 'Test Assignment',
        type: 'assignment',
        weight: 0.4,
        points: 50
      });
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await prioritizer.fetchPlannerItems();
      expect(result).toEqual([]);
    });

    it('should handle announcements correctly', async () => {
      const mockAnnouncement = {
        plannable_type: 'announcement',
        plannable: {
          title: 'Test Announcement'
        },
        plannable_date: '2024-03-20T23:59:59Z',
        context_name: 'Test Course'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockAnnouncement])
      });

      const result = await prioritizer.fetchPlannerItems();
      expect(result).toHaveLength(0); // Should filter out announcements
    });

    it('should parse discussion topics', async () => {
      const mockDiscussion = {
        plannable_type: 'discussion_topic',
        plannable: {
          title: 'Test Discussion',
          points_possible: 25
        },
        plannable_date: '2024-03-20T23:59:59Z',
        context_name: 'Test Course'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockDiscussion])
      });

      const result = await prioritizer.fetchPlannerItems();
      expect(result[0]).toMatchObject({
        type: 'discussion',
        weight: 0.2
      });
    });
  });

  describe('parseDashboardCards', () => {
    const mockDashboardCards = [
      {
        shortName: 'Test Course',
        assignments: [
          {
            name: 'Dashboard Assignment',
            due_at: '2024-03-22T23:59:59Z',
            points_possible: 75,
            id: '789',
            html_url: 'http://test.com/dashboard-assignment'
          }
        ]
      }
    ];

    it('should parse dashboard cards correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboardCards)
      });

      document.querySelector.mockReturnValue({
        querySelector: () => ({
          classList: {
            contains: (className) => className === 'icon-assignment'
          }
        })
      });

      const result = await prioritizer.parseDashboardCards();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Dashboard Assignment',
        type: 'assignment',
        weight: 0.4,
        points: 75
      });
    });
  });

  describe('calculatePriorities', () => {
    it('should calculate priorities correctly', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      prioritizer.assignments = [
        {
          title: 'Urgent Assignment',
          dueDate: tomorrow,
          weight: 0.4,
          courseGrade: 0.8
        },
        {
          title: 'Later Assignment',
          dueDate: nextWeek,
          weight: 0.3,
          courseGrade: 0.9
        }
      ];

      prioritizer.calculatePriorities();

      expect(prioritizer.assignments[0].priority).toBeGreaterThan(prioritizer.assignments[1].priority);
    });

    it('should prioritize assignments with closer due dates', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      prioritizer.assignments = [
        {
          title: 'Later Assignment',
          dueDate: dayAfterTomorrow,
          weight: 0.4,
          courseGrade: 0.8,
          points: 100
        },
        {
          title: 'Urgent Assignment',
          dueDate: tomorrow,
          weight: 0.4,
          courseGrade: 0.8,
          points: 100
        }
      ];

      prioritizer.calculatePriorities();
      expect(prioritizer.assignments[0].title).toBe('Urgent Assignment');
    });

    it('should prioritize assignments with higher point values', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      prioritizer.assignments = [
        {
          title: 'Low Points Assignment',
          dueDate: tomorrow,
          weight: 0.4,
          courseGrade: 0.8,
          points: 10
        },
        {
          title: 'High Points Assignment',
          dueDate: tomorrow,
          weight: 0.4,
          courseGrade: 0.8,
          points: 100
        }
      ];

      prioritizer.calculatePriorities();
      expect(prioritizer.assignments[0].title).toBe('High Points Assignment');
    });
  });

  describe('isValidAssignment', () => {
    it('should validate assignments correctly', () => {
      const validAssignment = {
        title: 'Valid Assignment',
        dueDate: new Date(),
        weight: 0.4
      };

      const invalidAssignment = {
        title: 'Invalid Assignment',
        dueDate: null,
        weight: NaN
      };

      expect(prioritizer.isValidAssignment(validAssignment)).toBe(true);
      expect(prioritizer.isValidAssignment(invalidAssignment)).toBe(false);
    });
  });

  describe('calculateDaysUntilDue', () => {
    it('should calculate days until due correctly', () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(prioritizer.calculateDaysUntilDue(tomorrow)).toBe(1);
      expect(prioritizer.calculateDaysUntilDue(nextWeek)).toBe(7);
    });
  });

  describe('Debug highlighting', () => {
    it('should add correct debug classes to elements', async () => {
      const mockElement = document.createElement('div');
      document.querySelector.mockReturnValue(mockElement);
      
      const mockItem = {
        plannable_type: 'assignment',
        plannable: {
          title: 'Test Assignment',
          points_possible: 100
        },
        plannable_date: '2024-03-20T23:59:59Z'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockItem])
      });

      await prioritizer.fetchPlannerItems();

      expect(mockElement.classList.contains('debug-highlight')).toBe(true);
      expect(mockElement.classList.contains('debug-highlight-assignment')).toBe(true);
      expect(mockElement.getAttribute('data-debug-type')).toBe('ASSIGNMENT');
    });
  });

  describe('Date highlighting', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="PlannerApp">
          <div data-testid="not-today" class="Day-styles__secondary">
            Saturday, February 15
          </div>
          <div class="PlannerItem-styles__root">
            <div class="PlannerItem-styles__due">
              Due: Feb 15 at 11:59pm
            </div>
          </div>
          <div class="AssignmentDetails__Date" data-datetime="2024-02-15T23:59:59Z">
            Thursday, Feb 15, 2024
          </div>
        </div>
      `;
    });

    it('should highlight Canvas date elements', () => {
      prioritizer.initialize();
      
      const dateElements = document.querySelectorAll('.debug-date');
      expect(dateElements.length).toBe(3);
      
      // Check specific Canvas elements
      const dayLabel = document.querySelector('.Day-styles__secondary');
      const dueDate = document.querySelector('.PlannerItem-styles__due');
      const assignmentDate = document.querySelector('.AssignmentDetails__Date');
      
      expect(dayLabel.classList.contains('debug-date')).toBe(true);
      expect(dueDate.classList.contains('debug-date')).toBe(true);
      expect(assignmentDate.classList.contains('debug-date')).toBe(true);
    });

    it('should parse Canvas date formats', () => {
      prioritizer.initialize();
      
      const assignmentDate = document.querySelector('.AssignmentDetails__Date');
      const datetime = assignmentDate.getAttribute('data-datetime');
      expect(new Date(datetime)).toEqual(new Date('2024-02-15T23:59:59Z'));
    });
  });

  describe('Date highlighting with Canvas structure', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="PlannerItem__Date">Feb 20</div>
        <div class="DueDateRow">Due Feb 21 at 11:59pm</div>
        <div class="DateField">February 22, 2024</div>
        <span class="AssignmentRow__Date">Due Today</span>
      `;
    });

    it('should find and highlight Canvas date elements', () => {
      const prioritizer = new AssignmentPrioritizer();
      prioritizer.initialize();

      const dateElements = document.querySelectorAll('.debug-date');
      expect(dateElements.length).toBe(4);

      // Check specific elements
      const plannerDate = document.querySelector('.PlannerItem__Date');
      const dueDate = document.querySelector('.DueDateRow');
      
      expect(plannerDate.classList.contains('debug-date')).toBe(true);
      expect(dueDate.classList.contains('debug-date')).toBe(true);
      expect(dueDate.getAttribute('data-date-type')).toBe('due date');
    });
  });
}); 