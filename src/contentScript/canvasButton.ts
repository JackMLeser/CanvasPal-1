// Types
interface Elements {
    button: HTMLElement;
    toggleContainer: HTMLElement;
    popup: HTMLElement;
}

interface Assignment {
    title: string;
    dueDate: string;
    course: string;
    points?: number;
    maxPoints?: number;
    priorityScore: number;
}

interface Settings {
    displayOptions?: {
        showOutsideCanvas?: boolean;
    };
}

// Helper functions
const getPriorityClass = (score: number): string => {
    if (score >= 0.7) return 'high-priority';
    if (score >= 0.4) return 'medium-priority';
    return 'low-priority';
};

const updateAssignmentsList = (assignments: Assignment[], assignmentList: HTMLElement, taskCount: HTMLElement): void => {
    try {
        console.log('Updating assignments list:', assignments);
        taskCount.textContent = `${assignments.length} Tasks`;
        assignmentList.innerHTML = assignments.map(assignment => `
            <div class="assignment-item ${getPriorityClass(assignment.priorityScore)}">
                <div style="font-weight: bold;">${assignment.title}</div>
                <div>Due: ${new Date(assignment.dueDate).toLocaleString()}</div>
                <div>Course: ${assignment.course}</div>
                <div>Points: ${assignment.points !== undefined ? assignment.points : (assignment.maxPoints || 0)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating assignments list:', error);
    }
};

const handleAssignmentUpdates = (button: HTMLElement, message: any): void => {
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
            chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
};

const setupEventListeners = (
    button: HTMLElement,
    popup: HTMLElement,
    toggleContainer: HTMLElement,
    isCanvasPage: boolean
): void => {
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
        chrome.runtime.onMessage.addListener((message) => handleAssignmentUpdates(button, message));

        // Get initial assignments
        console.log('Requesting initial assignments');
        chrome.runtime.sendMessage({ type: 'GET_ASSIGNMENTS' }, (response) => {
            try {
                console.log('Received initial assignments:', response);
                if (response?.assignments) {
                    handleAssignmentUpdates(button, {
                        type: 'ASSIGNMENTS_UPDATE',
                        data: response.assignments
                    });
                }
            } catch (error) {
                console.error('Error getting initial assignments:', error);
            }
        });
    }
};

const createElements = async (): Promise<Elements | null> => {
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
                width: 32px;
                height: 32px;
            }

            .logo-image {
                width: 16px;
                height: 16px;
                border-radius: 4px;
                border: 1px solid #FFFFFF;
                padding: 2px;
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
        
        try {
            // Create popup structure first
            console.log('Debug: Creating popup HTML structure');
            popup.innerHTML = `
                <div class="popup-header">
                    <div class="popup-title">CanvasPAL</div>
                    <div class="task-count" id="taskCount">0 Tasks</div>
                    <div class="logo">
                        <img id="logo-image" alt="CanvasPAL Logo" class="logo-image" />
                    </div>
                </div>
                <div class="assignments-list" id="assignmentList">
                    <!-- Assignments will be populated here -->
                </div>
                <div class="settings-button">
                    <button id="settings-button">Settings</button>
                </div>
            `;

            // Convert base64 to Blob URL
            const base64WithPrefix = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAABklEQVR4nHXS70sTcRwHcP+guLvvnbINNotMaCSsYDNGhI2exMJkUgaW9CD69cC7bJKLVkNdZKzUepDKrdPdLtk6rLboSeGZS7IRtN0uue282ycO7Qfn9ub99MX3++b7bXHSgpMWOhjuyKmzOInjJI5wEuEYhgiEE3vTYgKGc9L88dirnmt9bfY2DGEIJzFEYKgx4HfLcH0z0XOTV1ptrRRBmceQaCdEY0DzvvG50PQN/+mTDycmWV4wtnWWZW02W1Pgur0YjM51+33iSm7fwe6tqgoAXq+3KfBEhOfLuc6egf7z4ZKsGGAkEonmG2g+K22uFUujU8nh6ciSJBpgBAKB3R1/lvwDg7MrIwmuKzSq16Gyrd1K3i+UizpAJpOhKMoKXDSX2yiHHy/w71YBDADYUIoX58eGZrIA4Ha7raCTSa3LlaFYhn3/GcwYsqqdibPc6gfDMBwOhxX47vHXHwnt/U9ef/yyAxRNl1UNANh0kiAIKzgc5kpb6q9qjXmZv/Ag++ar4glLsqormnZzIb6/q2PPBiad+vT9rfTDPjB/aUIU18txcfNntd47teyJsr2xqyRJWsGxMSElfcsXSmq9XqnVZvMFb2TRNSzYR7gT4y/8l4ONXppJH7275I2mDtHmd/y/wafPDnjMi1nB31pA+x3OP0gjhH4DZGWA73ByC8UAAAAASUVORK5CYII=';
            console.log('Debug: Converting base64 to Blob');
            
            // Extract the base64 data after the comma
            const base64Data = base64WithPrefix.split(',')[1];
            console.log('Debug: Base64 data length:', base64Data.length);
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            const blobUrl = URL.createObjectURL(blob);
            console.log('Debug: Created Blob URL:', blobUrl);

            // Set the logo image src
            console.log('Debug: Finding logo image element');
            const logoImg = popup.querySelector('#logo-image') as HTMLImageElement;
            if (logoImg) {
                console.log('Debug: Found logo image element, setting src');
                logoImg.src = blobUrl;
                
                // Add load and error handlers
                logoImg.onload = () => {
                    console.log('Debug: Logo image loaded successfully');
                    console.log('Debug: Logo image properties:', {
                        src: logoImg.src.substring(0, 50) + '...',
                        width: logoImg.width,
                        height: logoImg.height,
                        complete: logoImg.complete,
                        naturalWidth: logoImg.naturalWidth,
                        naturalHeight: logoImg.naturalHeight
                    });
                };
                logoImg.onerror = (error) => {
                    console.error('Debug: Logo image failed to load:', error);
                };
            } else {
                console.error('Debug: Logo image element not found in popup');
            }
        } catch (error) {
            console.error('Debug: Error setting up popup content:', error);
        }

        document.body.appendChild(popup);

        // Add settings button click handler
        const settingsButton = popup.querySelector('#settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                console.log('Settings button clicked');
                try {
                    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' }, (response) => {
                        if (!response?.success) {
                            console.error('Failed to open settings page');
                        }
                    });
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

export const initializeButton = async (): Promise<void> => {
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

        setupEventListeners(button, popup, toggleContainer, isCanvasPage);
    } catch (error) {
        console.error('Error initializing button:', error);
    }
};
