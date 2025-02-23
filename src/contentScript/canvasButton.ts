    // Create and inject the button and popup HTML
const createElements = async () => {
    try {
        console.log('Creating CanvasPal elements');
        
        // Ensure we have access to chrome APIs
        if (!chrome?.runtime) {
            throw new Error('Chrome APIs not available');
        }

        // Create and inject styles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            .canvas-pal-button {
                position: fixed;
                right: 20px;
                top: 20px;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: #0066CC;
                color: white;
                border: none;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                z-index: 2147483647;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(8px);
            }

            .canvas-pal-button:hover {
                transform: translateY(-2px);
                background: #0056b3;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
            }

            .canvas-pal-button.has-assignments {
                animation: canvas-pal-pulse 2s infinite;
            }

            @keyframes canvas-pal-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            .canvas-pal-toggle {
                position: fixed;
                top: 20px;
                right: 70px;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.9);
                padding: 6px 12px;
                border-radius: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                font-family: 'Lato', sans-serif;
                font-size: 12px;
            }

            .canvas-pal-toggle input {
                margin: 0;
                cursor: pointer;
            }

            .popup-container {
                position: fixed;
                right: 20px;
                top: 75px;
                width: 350px;
                min-height: 400px;
                background: #f9f9f9;
                border: 2px solid #000;
                z-index: 2147483646;
                display: none;
                font-family: 'Lato', sans-serif;
            }

            .popup-container.show {
                display: block;
            }

            .popup-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background-color: #0066CC;
                color: white;
                padding: 12px;
                position: relative;
                border-bottom: 1px solid #666;
                margin-bottom: 16px;
            }

            .popup-title {
                flex-grow: 1;
                text-align: center;
                margin: 0;
                font-size: 2.3em;
                color: #FFFFFF;
                font-family: 'Lato', sans-serif;
            }

            .task-count {
                position: absolute;
                bottom: 8px;
                left: 9px;
                font-size: .7em;
                color: #FFFFFF;
                font-family: 'Lato', sans-serif;
            }

            .logo {
                margin-left: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 50px;
                height: 50px;
            }

            .logo-image {
                width: 100%;
                height: 100%;
                border-radius: 20%;
                border: 3px solid #FFFFFF;
                padding: 4px;
                background: white;
                object-fit: contain;
            }

            @media (prefers-color-scheme: dark) {
                .logo-image {
                    background: transparent;
                    border-color: rgba(255, 255, 255, 0.8);
                }
            }

            .assignments-list {
                max-height: 300px;
                overflow-y: auto;
                padding: 16px;
            }

            .assignment-item {
                padding: 12px;
                border: 1px solid #eee;
                margin-bottom: 8px;
                border-radius: 4px;
                background: white;
            }

            .assignment-item.high-priority {
                border-left: 4px solid #d92b2b;
            }

            .assignment-item.medium-priority {
                border-left: 4px solid #f0ad4e;
            }

            .assignment-item.low-priority {
                border-left: 4px solid #5cb85c;
            }

            .settings-button {
                bottom: 16px;
                right: 16px;
                position: absolute;
                text-align: center;
            }

            .settings-button button {
                background-color: #0066CC;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                transition: background-color 0.3s, transform 0.3s;
                font-family: 'Lato', sans-serif;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }

            .settings-button button:hover {
                background-color: #0056b3;
                transform: scale(1.08);
            }

            @media (prefers-color-scheme: dark) {
                .popup-container {
                    background: #1c1c1e;
                    border-color: #666;
                }

                .assignment-item {
                    background: #2c2c2e;
                    border-color: #666;
                    color: white;
                }

                .logo img {
                    background: transparent;
                }

                .canvas-pal-toggle {
                    background: rgba(45, 59, 69, 0.9);
                    color: white;
                }
            }
        `;
        document.head.appendChild(styleSheet);

        // Create button
        const button = document.createElement('button');
        button.className = 'canvas-pal-button';
        button.textContent = '0';
        document.body.appendChild(button);

        // Create toggle for non-Canvas pages
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'canvas-pal-toggle';
        toggleContainer.innerHTML = `
            <label>
                <input type="checkbox" id="canvas-pal-visibility" checked>
                <span>Follow Outside Canvas</span>
            </label>
        `;
        document.body.appendChild(toggleContainer);

        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'popup-container';
        popup.innerHTML = `
            <div class="popup-header">
                <div class="popup-title">CanvasPAL</div>
                <div class="task-count" id="taskCount">0 Tasks</div>
                <div class="logo">
                    <img src="data:image/png;base64,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" alt="CanvasPAL Logo" class="logo-image" />
                </div>
            </div>
            <div class="assignments-list" id="assignmentList">
                <!-- Assignments will be populated here -->
            </div>
            <div class="settings-button">
                <button id="settings-button">Settings</button>
            </div>
        `;
        document.body.appendChild(popup);

        // No need for complex icon loading since we're using root-relative path

        // Add settings button click handler
        const settingsButton = popup.querySelector('#settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                console.log('Settings button clicked');
                try {
                    const settingsUrl = chrome.runtime.getURL('settings/settings.html');
                    console.log('Opening settings at:', settingsUrl);
                    window.open(settingsUrl, '_blank');
                } catch (error) {
                    console.error('Error opening settings:', error);
                }
            });
        }

        return { button, toggleContainer, popup };
    } catch (error) {
        console.error('Error creating elements:', error);
        return null;
    }
};

// Helper function to determine priority class
function getPriorityClass(score: number): string {
    if (score >= 0.7) return 'high-priority';
    if (score >= 0.4) return 'medium-priority';
    return 'low-priority';
}

// Helper function to safely update assignments list
function updateAssignmentsList(assignments: any[], assignmentList: HTMLElement, taskCount: HTMLElement) {
    try {
        console.log('Updating assignments list:', assignments);
        taskCount.textContent = `${assignments.length} Tasks`;
        assignmentList.innerHTML = assignments.map(assignment => `
            <div class="assignment-item ${getPriorityClass(assignment.priorityScore)}">
                <div style="font-weight: bold;">${assignment.title}</div>
                <div>Due: ${assignment.dueDate}</div>
                <div>Course: ${assignment.courseName}</div>
                <div>Points: ${assignment.points}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating assignments list:', error);
    }
}

// Initialize button and popup functionality
export const initializeButton = async () => {
    try {
        console.log('Initializing CanvasPal button');
        const isCanvasPage = window.location.href.includes('.instructure.com');
        const elements = await createElements();
        
        if (!elements) {
            console.error('Failed to create elements');
            return;
        }

        const { button, toggleContainer, popup } = elements;

        // Show/hide toggle based on page type
        toggleContainer.style.display = isCanvasPage ? 'flex' : 'none';

        // Initialize visibility from settings
        if (chrome?.storage?.local) {
            chrome.storage.local.get('settings', (data) => {
                try {
                    const settings = data.settings || { displayOptions: { showOutsideCanvas: true } };
                    const showOutsideCanvas = settings.displayOptions?.showOutsideCanvas ?? true;
                    
                    // Update checkbox state
                    const checkbox = document.getElementById('canvas-pal-visibility') as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = showOutsideCanvas;
                    }

                    // Update button visibility
                    if (!isCanvasPage) {
                        button.style.display = showOutsideCanvas ? 'flex' : 'none';
                    }
                } catch (error) {
                    console.error('Error handling settings:', error);
                }
            });
        }

        // Handle button click
        button.addEventListener('click', () => {
            popup.classList.toggle('show');
        });

        // Handle toggle change
        const checkbox = document.getElementById('canvas-pal-visibility');
        checkbox?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (chrome?.storage?.local) {
                chrome.storage.local.get('settings', (data) => {
                    try {
                        const settings = data.settings || { displayOptions: {} };
                        if (!settings.displayOptions) settings.displayOptions = {};
                        settings.displayOptions.showOutsideCanvas = target.checked;
                        chrome.storage.local.set({ settings });
                        
                        // Update button visibility
                        if (!isCanvasPage) {
                            button.style.display = target.checked ? 'flex' : 'none';
                        }
                    } catch (error) {
                        console.error('Error updating settings:', error);
                    }
                });
            }
        });

        // Close popup when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!popup.contains(target) && !button.contains(target)) {
                popup.classList.remove('show');
            }
        });

        // Handle assignment updates
        if (chrome?.runtime) {
            chrome.runtime.onMessage.addListener((message) => {
                try {
                    console.log('Received message:', message);
                    if (message.type === 'ASSIGNMENTS_UPDATE') {
                        button.textContent = message.data.length.toString();
                        button.classList.toggle('has-assignments', message.data.length > 0);

                        const assignmentList = document.getElementById('assignmentList');
                        const taskCount = document.getElementById('taskCount');
                        
                        if (assignmentList && taskCount) {
                            updateAssignmentsList(message.data, assignmentList, taskCount);
                        }
                    } else if (message.type === 'REFRESH_ASSIGNMENTS') {
                        // Request fresh assignments from the background script
                        chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' });
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            });

            // Get initial assignments
            console.log('Requesting initial assignments');
            chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' }, (response) => {
                try {
                    console.log('Received initial assignments:', response);
                    if (response?.assignments) {
                        button.textContent = response.assignments.length.toString();
                        button.classList.toggle('has-assignments', response.assignments.length > 0);

                        const assignmentList = document.getElementById('assignmentList');
                        const taskCount = document.getElementById('taskCount');
                        
                        if (assignmentList && taskCount) {
                            updateAssignmentsList(response.assignments, assignmentList, taskCount);
                        }
                    }
                } catch (error) {
                    console.error('Error getting initial assignments:', error);
                }
            });
        }
    } catch (error) {
        console.error('Error initializing button:', error);
    }
};
