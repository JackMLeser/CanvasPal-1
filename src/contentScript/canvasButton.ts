// Create and inject the button and popup HTML
const createElements = async () => {
    try {
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

            .logo img {
                width: 50px;
                height: auto;
                border-radius: 20%;
                border: 3px solid #FFFFFF;
                padding: 0;
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
            }

            .settings-button button:hover {
                background-color: #0056b3;
                transform: scale(1.08);
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
                    <img src="${chrome.runtime.getURL('icons/icon128.png')}" alt="CanvasPAL Logo" />
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

        // Add settings button click handler
        const settingsButton = popup.querySelector('#settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                if (chrome?.runtime) {
                    const settingsUrl = chrome.runtime.getURL('settings/settings.html');
                    chrome.runtime.sendMessage({ 
                        type: 'OPEN_SETTINGS',
                        url: settingsUrl
                    }, () => {
                        window.open(settingsUrl, '_blank');
                    });
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
            chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' }, (response) => {
                try {
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
