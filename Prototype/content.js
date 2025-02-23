console.log('Extension loaded!');
console.log('Current URL:', window.location.href);

// Constants for priority calculation
const PRIORITY_WEIGHTS = {
  GRADE_IMPACT: 0.4,
  COURSE_GRADE: 0.3,
  DUE_DATE: 0.3
};

let globalAssignments = [];

// Add debug levels and structured logging
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LOG_LEVELS.DEBUG;

// Add these constants at the top of content.js
const DEBUG_COLORS = {
  ASSIGNMENT: '#ff69b4',  // Hot pink
  QUIZ: '#87ceeb',       // Sky blue
  DISCUSSION: '#98fb98',  // Pale green
  ANNOUNCEMENT: '#dda0dd' // Plum
};

// Add these constants at the top
const DATE_DEBUG_STYLES = `
  .debug-date {
    background-color: rgba(255, 255, 0, 0.3) !important;
    border: 2px solid #ffd700 !important;
    position: relative !important;
    z-index: 1000;
    padding: 2px !important;
    margin: 2px !important;
    border-radius: 3px !important;
    display: inline-block !important;
  }
  .debug-date::after {
    content: "DATE";
    position: absolute;
    top: -20px;
    left: 0;
    background: #ffd700;
    color: black;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 2px;
    z-index: 1001;
    pointer-events: none;
    white-space: nowrap;
  }
  .debug-date[title*="Due"]::after,
  .debug-date[aria-label*="Due"]::after {
    content: "DUE DATE";
    background: #ff6b6b;
    color: white;
  }
`;

// Add this CSS to dynamically highlight elements
const debugStyles = `
  .debug-highlight {
    position: relative !important;
    border: 2px solid transparent;
  }
  .debug-highlight::before {
    content: attr(data-debug-type);
    position: absolute;
    top: -20px;
    left: 0;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    color: white;
    z-index: 9999;
  }
  .debug-highlight-assignment {
    border-color: ${DEBUG_COLORS.ASSIGNMENT} !important;
  }
  .debug-highlight-assignment::before {
    background-color: ${DEBUG_COLORS.ASSIGNMENT};
  }
  .debug-highlight-quiz {
    border-color: ${DEBUG_COLORS.QUIZ} !important;
  }
  .debug-highlight-quiz::before {
    background-color: ${DEBUG_COLORS.QUIZ};
  }
  .debug-highlight-discussion {
    border-color: ${DEBUG_COLORS.DISCUSSION} !important;
  }
  .debug-highlight-discussion::before {
    background-color: ${DEBUG_COLORS.DISCUSSION};
  }
  .debug-highlight-announcement {
    border-color: ${DEBUG_COLORS.ANNOUNCEMENT} !important;
  }
  .debug-highlight-announcement::before {
    background-color: ${DEBUG_COLORS.ANNOUNCEMENT};
  }
`;

// Add the debug styles to the page
function injectDebugStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = debugStyles;
  document.head.appendChild(styleElement);
}

// Helper functions for different log levels
function logDebug(msg, data) { log(msg, data, LOG_LEVELS.DEBUG); }
function logInfo(msg, data) { log(msg, data, LOG_LEVELS.INFO); }
function logWarn(msg, data) { log(msg, data, LOG_LEVELS.WARN); }
function logError(msg, data) { log(msg, data, LOG_LEVELS.ERROR); }

function log(message, data = null, level = LOG_LEVELS.INFO) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = getLogPrefix(level);
  
  if (level >= currentLogLevel) {
    if (data) {
      // Pretty print objects, handle DOM elements specially
      const formattedData = formatLogData(data);
      console.log(`[${timestamp}] ${prefix} ${message}:`, formattedData);
    } else {
      console.log(`[${timestamp}] ${prefix} ${message}`);
    }
  }
}

function formatLogData(data) {
  if (data instanceof Element) {
    return {
      tagName: data.tagName,
      id: data.id,
      className: data.className,
      textContent: data.textContent?.substring(0, 100) + '...',
      html: data.outerHTML?.substring(0, 200) + '...'
    };
  } else if (Array.isArray(data)) {
    return data.map(item => formatLogData(item));
  } else if (data && typeof data === 'object') {
    const formatted = {};
    for (const [key, value] of Object.entries(data)) {
      formatted[key] = formatLogData(value);
    }
    return formatted;
  }
  return data;
}

function getLogPrefix(level) {
  switch(level) {
    case LOG_LEVELS.DEBUG: return '🔍 DEBUG:';
    case LOG_LEVELS.INFO: return '📢 INFO:';
    case LOG_LEVELS.WARN: return '⚠️ WARN:';
    case LOG_LEVELS.ERROR: return '❌ ERROR:';
    default: return '📢';
  }
}

function inspectHTML() {
  log('🔍 Starting HTML inspection');
  
  // Log the entire document structure
  log('📄 Document Title:', document.title);
  log('🌐 Current URL:', window.location.href);
  
  // Log main content area
  const mainContent = document.getElementById('content') || document.getElementById('main');
  if (mainContent) {
    log('📋 Main content area HTML:', mainContent.outerHTML);
  }
  
  // Log specific areas we're interested in
  const todoList = document.querySelector('div.todo-list');
  if (todoList) {
    log('📝 Todo List found:', todoList.outerHTML);
    const todos = todoList.querySelectorAll('li.todo');
    log(`Found ${todos.length} todo items`);
    todos.forEach((todo, index) => {
      log(`Todo item ${index + 1}:`, {
        html: todo.outerHTML,
        text: todo.textContent.trim(),
        links: Array.from(todo.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        }))
      });
    });
  } else {
    log('❌ No todo list found');
  }
  
  const upcomingEvents = document.querySelector('div.coming_up');
  if (upcomingEvents) {
    log('📅 Upcoming events found:', upcomingEvents.outerHTML);
    const events = upcomingEvents.querySelectorAll('li.upcoming-list-item');
    log(`Found ${events.length} upcoming events`);
    events.forEach((event, index) => {
      log(`Event ${index + 1}:`, {
        html: event.outerHTML,
        text: event.textContent.trim(),
        links: Array.from(event.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        }))
      });
    });
  } else {
    log('❌ No upcoming events found');
  }
  
  // Log all assignment-like elements
  const assignmentSelectors = [
    'div.todo-list li.todo',
    'div.coming_up li.upcoming-list-item',
    '.assignment',
    '[id*="assignment_"]',
    '[class*="assignment"]'
  ];
  
  assignmentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    log(`🔍 Elements matching "${selector}":`, {
      count: elements.length,
      elements: Array.from(elements).map(el => ({
        html: el.outerHTML,
        text: el.textContent.trim()
      }))
    });
  });
}

function injectDateDebugStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = DATE_DEBUG_STYLES;
  document.head.appendChild(styleElement);
}

function cleanAssignmentTitle(fullTitle) {
  // Remove the "Assignment" prefix and extract the actual title
  const titleMatch = fullTitle.match(/Assignment (.*?)(?:, due|$)/);
  return titleMatch ? titleMatch[1] : fullTitle;
}

function extractDueDate(fullTitle) {
  // Extract the due date from the title
  const dateMatch = fullTitle.match(/due (.*?)(?:\.|$)/);
  return dateMatch ? dateMatch[1] : '';
}

// Add this function to send data to the extension popup
function sendAssignmentsToExtension(assignments) {
  chrome.runtime.sendMessage({
    type: 'ASSIGNMENTS_UPDATE',
    data: assignments.map(a => ({
      title: a.title,
      points: a.points,
      pointsText: a.pointsText,
      dueDate: a.dueDate,
      courseName: a.courseName || 'Unknown Course',
      priority: calculateAssignmentPriority(a)
    }))
  });
}

// Add priority calculation function
function calculateAssignmentPriority(assignment) {
  const priorityCalculator = new PriorityCalculator();
  
  const priorityAssignment = {
    title: assignment.title,
    dueDate: assignment.dueDate,
    points: assignment.points,
    maxPoints: 100, // You might want to get this from the assignment data
    courseWeight: 1, // You might want to get this from course settings
    courseName: assignment.courseName
  };

  const priority = priorityCalculator.calculatePriority(priorityAssignment);
  return priority.score; // This maintains compatibility with existing code
}

// Update the highlightDates function to send data to extension
function highlightDates() {
  const processedAssignments = new Map();
  const assignmentContainers = document.querySelectorAll('div[data-testid="planner-item-raw"]');
  
  assignmentContainers.forEach(container => {
    const assignmentLink = container.querySelector('a[href*="/assignments/"]');
    const pointsSpan = container.querySelector('span.css-mum2ig-text[wrap="normal"][letter-spacing="normal"]');
    const ptsSpan = container.querySelector('span.css-1uakmj8-text');
    
    if (assignmentLink && pointsSpan) {
      const assignmentId = assignmentLink.href;
      
      if (processedAssignments.has(assignmentId)) return;

      const points = parseInt(pointsSpan.textContent);
      const pointsText = ptsSpan ? ptsSpan.textContent.trim() : 'pts';
      const fullTitle = assignmentLink.textContent.trim();
      
      if (!isNaN(points)) {
        // Highlight the points spans
        pointsSpan.style.backgroundColor = '#90EE90';
        pointsSpan.style.padding = '0 4px';
        if (ptsSpan) {
          ptsSpan.style.backgroundColor = '#ADD8E6';
          ptsSpan.style.padding = '0 4px';
        }

        // Store assignment info with additional details
        processedAssignments.set(assignmentId, {
          fullTitle: fullTitle,
          title: cleanAssignmentTitle(fullTitle),
          dueDate: extractDueDate(fullTitle),
          points: points,
          pointsText: pointsText,
          element: container,
          courseName: container.querySelector('[class*="PlannerItem__Course"]')?.textContent || ''
        });

        console.log('Found unique assignment:', {
          title: cleanAssignmentTitle(fullTitle),
          dueDate: extractDueDate(fullTitle),
          points: `${points} ${pointsText}`,
          container: container.outerHTML
        });
      }
    }
  });

  // Update debug panel and send to extension
  updateDebugPanel(processedAssignments);
  sendAssignmentsToExtension(Array.from(processedAssignments.values()));
}

// Update the updateDebugPanel function to only handle data without creating a visible panel
function updateDebugPanel(processedAssignments) {
  const assignments = Array.from(processedAssignments.values());
  assignments.sort((a, b) => calculateAssignmentPriority(b) - calculateAssignmentPriority(a));

  // Just log to console instead of creating a visible panel
  console.log('Processed Assignments:', assignments.map(a => ({
    title: a.title,
    points: `${a.points} ${a.pointsText}`,
    dueDate: a.dueDate,
    courseName: a.courseName,
    priority: Math.round(calculateAssignmentPriority(a) * 100) + '%'
  })));
}

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', highlightDates);
} else {
  highlightDates();
}

// Also try after a short delay for dynamic content
setTimeout(highlightDates, 2000);

// Import priority system (at the top of content.js)
class PriorityCalculator {
  constructor(thresholds = { HIGH: 0.7, MEDIUM: 0.4 }, weights = { DUE_DATE: 0.6, POINTS: 0.3, COURSE_WEIGHT: 0.1 }) {
    this.thresholds = thresholds;
    this.weights = weights;
  }

  calculatePriority(assignment) {
    const timeUrgency = this.calculateTimeUrgency(assignment.dueDate);
    const pointsWeight = this.calculatePointsWeight(assignment.points);
    const courseWeight = this.calculateCourseWeight(assignment.courseWeight);

    const score = 
      timeUrgency * this.weights.DUE_DATE +
      pointsWeight * this.weights.POINTS +
      courseWeight * this.weights.COURSE_WEIGHT;

    return {
      level: this.getPriorityLevel(score),
      score,
      factors: {
        timeUrgency,
        pointsWeight,
        courseWeight
      }
    };
  }

  calculateTimeUrgency(dueDate) {
    try {
      // Parse the date string (e.g., "Feb 24 at 11:59pm")
      const [monthDay, time] = dueDate.split(' at ');
      const [month, day] = monthDay.split(' ');
      
      // Create date object for due date
      const now = new Date();
      const due = new Date(`${month} ${day}, ${now.getFullYear()} ${time}`);
      
      // If the due date appears to be in the past, it's probably for next year
      if (due < now) {
        due.setFullYear(due.getFullYear() + 1);
      }

      // Calculate days until due
      const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

      // Log for debugging
      console.log('Due date calculation:', {
        original: dueDate,
        parsed: due.toLocaleString(),
        daysUntilDue: daysUntilDue
      });

      return daysUntilDue;
    } catch (error) {
      console.error('Error calculating days until due:', error, { dueDate });
      return null;
    }
  }

  calculatePointsWeight(points, maxPoints = 100) {
    return Math.min(1, points / maxPoints);
  }

  calculateCourseWeight(weight = 1) {
    return Math.min(1, weight);
  }

  getPriorityLevel(score) {
    if (score >= this.thresholds.HIGH) return 'high';
    if (score >= this.thresholds.MEDIUM) return 'medium';
    return 'low';
  }
}

// Global popup variable
let popup;

// First, declare all styles at the top
const combinedStyles = `
  .assignments-button {
    position: fixed;
    right: 20px;
    top: 20px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 122, 255, 0.95);
    color: white;
    border: none;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
  }

  .assignments-button.has-assignments {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .assignments-button:hover {
    transform: translateY(-2px);
    background: rgba(0, 122, 255, 1);
    box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
  }

  .assignments-popup {
    position: fixed;
    z-index: 2147483646;
    right: 20px;
    top: 75px;
    width: 380px;
    max-height: 600px;
    background: rgba(255, 255, 255, 0.98);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    display: none;
    overflow: hidden;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .assignments-popup.show {
    display: block;
  }

  .popup-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  .popup-title {
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
  }

  .task-count {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }

  .popup-content {
    padding: 16px;
    overflow-y: auto;
    max-height: calc(600px - 70px);
  }
`;

// Add these styles to your combinedStyles
const popupWithSettingsStyles = `
  .popup-content {
    position: relative;
    height: calc(600px - 65px);
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
  }

  .assignments-list {
    padding: 16px;
  }

  .assignment-card {
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .assignment-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .assignment-card.urgent {
    border-left: 4px solid #FF453A;
  }

  .assignment-card.soon {
    border-left: 4px solid #FF9F0A;
  }

  .assignment-title {
    color: #007AFF;
    text-decoration: none;
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 12px;
    display: block;
  }

  .assignment-title:hover {
    color: #0056b3;
  }

  .due-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .due-date {
    font-size: 13px;
    color: #666;
  }

  .time-remaining {
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 20px;
    background: #F2F2F7;
    color: #666;
  }

  .time-remaining.urgent {
    background: #FF453A15;
    color: #FF453A;
  }

  .time-remaining.soon {
    background: #FF9F0A15;
    color: #FF9F0A;
  }

  .points {
    font-size: 13px;
    color: #666;
    padding: 4px 10px;
    border-radius: 20px;
    background: #F2F2F7;
    display: inline-block;
  }

  .settings-content {
    display: none;
    padding: 24px;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    z-index: 10;
    overflow-y: auto;
  }

  .settings-content.show {
    display: block;
  }

  .settings-header {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .back-button {
    background: none;
    border: none;
    color: #007AFF;
    font-size: 16px;
    cursor: pointer;
    padding: 8px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-button:hover {
    color: #0056b3;
  }

  .settings-section {
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .settings-section-title {
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
    margin-bottom: 20px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-label-group {
    flex: 1;
  }

  .setting-label {
    font-size: 15px;
    color: #1d1d1f;
    font-weight: 500;
  }

  .setting-description {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 120px;
  }

  .setting-control input[type="checkbox"] {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #007AFF;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
  }

  .setting-control input[type="checkbox"]:checked {
    background: #007AFF;
  }

  .setting-control input[type="checkbox"]:checked::after {
    content: "✓";
    color: white;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 14px;
  }

  .setting-control input[type="range"] {
    width: 150px;
    height: 4px;
    border-radius: 2px;
    background: #007AFF;
    outline: none;
    -webkit-appearance: none;
  }

  .setting-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #007AFF;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .setting-control select {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: white;
    font-size: 14px;
    color: #1d1d1f;
    outline: none;
    cursor: pointer;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .popup-content,
    .settings-content,
    .popup-header {
      background: rgba(28, 28, 30, 0.98);
    }

    .assignment-card {
      background: rgba(44, 44, 46, 0.8);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .popup-title {
      color: #fff;
    }

    .assignment-title {
      color: #0A84FF;
    }

    .assignment-title:hover {
      color: #409CFF;
    }

    .due-date,
    .task-count {
      color: #98989D;
    }

    .time-remaining,
    .points {
      background: rgba(255, 255, 255, 0.1);
      color: #98989D;
    }

    .settings-trigger {
      color: #0A84FF;
    }

    .settings-trigger:hover {
      background: rgba(10, 132, 255, 0.1);
    }

    .settings-content {
      background: rgba(28, 28, 30, 0.98);
    }

    .settings-section {
      background: rgba(44, 44, 46, 0.8);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .settings-section-title,
    .setting-label {
      color: #fff;
    }

    .setting-description {
      color: #98989d;
    }

    .back-button {
      color: #0A84FF;
    }

    .back-button:hover {
      color: #409CFF;
    }

    .setting-control select {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }
`;

// Update your styleSheet declaration to include the settings styles
const styleSheet = document.createElement('style');
styleSheet.textContent = combinedStyles + popupWithSettingsStyles;
document.head.appendChild(styleSheet);

// Initialize everything when the page loads
(function() {
  console.log('Initializing Canvas Assignment Extension...');

  // Create and inject the button immediately
  const button = document.createElement('button');
  button.className = 'assignments-button';
  button.textContent = '0';
  button.style.position = 'fixed';
  button.style.right = '20px';
  button.style.top = '20px';
  button.style.zIndex = '9999999';
  document.body.appendChild(button);

  // Create and inject the popup
  popup = document.createElement('div');
  popup.className = 'assignments-popup';
  popup.innerHTML = `
    <div class="popup-header">
      <div class="header-title">
        <div class="popup-title">Assignments</div>
        <div class="task-count">0 Tasks</div>
      </div>
      <button class="settings-trigger">⚙️</button>
    </div>
    <div class="popup-content">
      <div class="assignments-list"></div>
      <div class="settings-content">
        <div class="settings-header">
          <button class="back-button">← Back</button>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Notifications</div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Due Date Reminders</div>
              <div class="setting-description">Get notified before assignments are due</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="dueDateReminders">
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Reminder Time</div>
              <div class="setting-description">How early to remind you</div>
            </div>
            <div class="setting-control">
              <select>
                <option>1 day before</option>
                <option>2 days before</option>
                <option>3 days before</option>
                <option>1 week before</option>
              </select>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Display</div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Dark Mode</div>
              <div class="setting-description">Use dark theme</div>
            </div>
            <div class="setting-control">
              <input type="checkbox" id="darkMode">
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Sort Order</div>
              <div class="setting-description">How to sort assignments</div>
            </div>
            <div class="setting-control">
              <select>
                <option>Due Date</option>
                <option>Priority</option>
                <option>Points</option>
              </select>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Priority Calculation</div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Due Date Weight</div>
              <div class="setting-description">Importance of due dates</div>
            </div>
            <div class="setting-control">
              <input type="range" id="dueDateWeight" min="0" max="100" value="60">
              <span>60%</span>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label-group">
              <div class="setting-label">Points Weight</div>
              <div class="setting-description">Importance of point values</div>
            </div>
            <div class="setting-control">
              <input type="range" id="pointsWeight" min="0" max="100" value="30">
              <span>30%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  // Add click handler for the button
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('show');
    if (popup.classList.contains('show')) {
      updatePopupContent();
    }
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && !button.contains(e.target)) {
      popup.classList.remove('show');
    }
  });

  // Initial collection of assignments
  const assignments = collectAssignments();
  if (assignments && assignments.length > 0) {
    button.textContent = assignments.length;
    button.classList.add('has-assignments');
  }

  // Update assignments periodically
  setInterval(() => {
    const assignments = collectAssignments();
    if (assignments && assignments.length > 0) {
      button.textContent = assignments.length;
      button.classList.add('has-assignments');
    }
  }, 30000); // Check every 30 seconds

  // Add click handlers after creating the popup
  const settingsTrigger = popup.querySelector('.settings-trigger');
  const backButton = popup.querySelector('.back-button');
  const settingsContent = popup.querySelector('.settings-content');
  const assignmentsList = popup.querySelector('.assignments-list');

  settingsTrigger.addEventListener('click', () => {
    settingsContent.classList.add('show');
  });

  backButton.addEventListener('click', () => {
    settingsContent.classList.remove('show');
  });

  console.log('Canvas Assignment Extension initialized!');
})();

// Update calculateDaysRemaining function
function calculateDaysRemaining(dueDate) {
  if (dueDate === 'No due date set') return null;
  
  try {
    const parts = dueDate.split(',').map(part => part.trim());
    const [dayOfWeek, rest] = parts;
    const [month, day, year, time, period] = rest.split(' ').filter(Boolean);
    
    const due = new Date(`${month} ${day} ${year} ${time} ${period}`);
    const now = new Date();
    
    const daysRemaining = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    
    console.log('Date calculation:', {
      original: dueDate,
      parsed: due.toLocaleString(),
      daysRemaining: daysRemaining
    });

    return daysRemaining;
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return null;
  }
}

function updatePopupContent() {
  const assignmentsList = popup.querySelector('.assignments-list');
  if (!assignmentsList) return;

  const assignments = collectAssignments();
  console.log('Assignments for popup:', assignments);

  if (assignments.length === 0) {
    assignmentsList.innerHTML = '<div class="no-assignments">No assignments found</div>';
    return;
  }

  // Update task count
  const taskCount = popup.querySelector('.task-count');
  if (taskCount) {
    taskCount.textContent = `${assignments.length} Tasks`;
  }

  // Generate HTML for assignments
  assignmentsList.innerHTML = assignments.map(assignment => {
    const daysLeft = assignment.daysRemaining;
    let urgencyClass = '';
    let timeStatus = '';

    if (daysLeft !== null) {
      if (daysLeft < 0) {
        urgencyClass = 'urgent';
        timeStatus = '⚠️ Past due!';
      } else if (daysLeft === 0) {
        urgencyClass = 'urgent';
        timeStatus = '⚠️ Due today!';
      } else if (daysLeft === 1) {
        urgencyClass = 'urgent';
        timeStatus = '⚠️ Due tomorrow!';
      } else if (daysLeft <= 3) {
        urgencyClass = 'soon';
        timeStatus = `⚡ Due in ${daysLeft} days!`;
      } else {
        timeStatus = `${daysLeft} days remaining`;
      }
    } else {
      timeStatus = 'No due date';
    }

    return `
      <div class="assignment-card ${urgencyClass}">
        <a href="${assignment.link}" class="assignment-title" target="_blank">
          ${assignment.title}
        </a>
        <div class="assignment-details">
          <div class="due-info">
            <div class="due-date">Due: ${assignment.dueDate}</div>
            <div class="time-remaining ${urgencyClass}">
              ${timeStatus}
            </div>
          </div>
          <div class="points">Points: ${assignment.points} ${assignment.pointsText}</div>
        </div>
      </div>
    `;
  }).join('');
}

function collectAssignments() {
  const assignments = [];
  const assignmentContainers = document.querySelectorAll('div[data-testid="planner-item-raw"]');
  
  console.log('Found assignment containers:', assignmentContainers.length);

  assignmentContainers.forEach(container => {
    const assignmentLink = container.querySelector('a[href*="/assignments/"]') || container.querySelector('a[href*="/quizzes/"]');
    const pointsSpan = container.querySelector('span.css-mum2ig-text[wrap="normal"][letter-spacing="normal"]');
    const ptsSpan = container.querySelector('span.css-1uakmj8-text');
    
    // Get date from the screen reader content
    const screenReaderText = container.querySelector('a[dir="ltr"] .css-1sr5vj2-screenReaderContent')?.textContent || '';
    
    if (assignmentLink && pointsSpan) {
      // Get title (without date)
      const title = assignmentLink.querySelector('span[aria-hidden="true"]')?.textContent.trim() || assignmentLink.textContent.trim();
      
      // Get points
      const points = parseInt(pointsSpan.textContent);
      const pointsText = ptsSpan ? ptsSpan.textContent.trim() : 'pts';

      // Get due date from screen reader content
      let dueDate = 'No due date set';
      const dateMatch = screenReaderText.match(/due\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+(?:AM|PM))/i);
      
      if (dateMatch) {
        dueDate = dateMatch[1].trim();
      }

      // Calculate days remaining
      const daysLeft = calculateDaysRemaining(dueDate);

      if (!isNaN(points)) {
        const assignment = {
          title: title,
          dueDate: dueDate,
          points: points,
          pointsText: pointsText,
          daysRemaining: daysLeft,
          link: assignmentLink.href
        };

        console.log('Processed assignment:', assignment);
        assignments.push(assignment);
      }
    }
  });

  console.log('Assignments for popup:', assignments);
  return assignments;
}