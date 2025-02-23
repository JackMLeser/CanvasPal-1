import { Settings } from '../types/models';
import { Logger } from '../utils/logger';
import { DebugManager } from '../utils/debugManager';

export class SettingsManager {
    private logger: Logger;
    private debugManager: DebugManager;
    private defaultSettings: Settings = {
        priorityWeights: {
            GRADE_IMPACT: 0.4,
            COURSE_GRADE: 0.3,
            DUE_DATE: 0.3
        },
        typeWeights: {
            quiz: 1.2,
            assignment: 1.0,
            discussion: 0.8,
            announcement: 0.5
        },
        displayOptions: {
            showCourseNames: true,
            showGradeImpact: true,
            showPriorityScores: true,
            highlightOverdue: true,
            showOutsideCanvas: true
        },
        refreshInterval: 30,
        debugSettings: {
            enabled: false,
            logLevel: 'info',
            showDateDebug: false,
            showAssignmentDebug: false,
            showPriorityDebug: false
        },
        icalUrl: ''
    };

    constructor() {
        this.logger = new Logger('SettingsManager');
        this.debugManager = new DebugManager();
        this.initializeEventListeners();
        this.loadSettings();
    }

    private initializeEventListeners(): void {
        document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());

        // Priority weight sliders
        ['gradeImpact', 'courseGrade', 'dueDate'].forEach(id => {
            const slider = document.getElementById(id) as HTMLInputElement;
            const valueDisplay = document.getElementById(`${id}Value`);
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    valueDisplay.textContent = `${slider.value}%`;
                    this.validateWeights();
                });
            }
        });

        // Debug settings
        document.getElementById('debugEnabled')?.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            this.updateDebugSettings({ enabled });
        });

        document.getElementById('logLevel')?.addEventListener('change', (e) => {
            const level = (e.target as HTMLSelectElement).value as Settings['debugSettings']['logLevel'];
            this.updateDebugSettings({ logLevel: level });
        });

        ['showDateDebug', 'showAssignmentDebug', 'showPriorityDebug'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                const value = (e.target as HTMLInputElement).checked;
                this.updateDebugSettings({ [id]: value });
            });
        });
    }

    private updateDebugSettings(settings: Partial<Settings['debugSettings']>): void {
        this.debugManager.updateDebugConfig(settings);
        this.saveSettings();
    }

    private async loadSettings(): Promise<void> {
        try {
            const result = await chrome.storage.sync.get('settings');
            let settings: Settings = result.settings || this.defaultSettings;
            
            // Ensure debug settings are disabled by default
            settings = {
                ...settings,
                debugSettings: {
                    ...settings.debugSettings,
                    enabled: false,
                    showDateDebug: false,
                    showAssignmentDebug: false,
                    showPriorityDebug: false
                }
            };
            
            // Save the settings with debug disabled
            await chrome.storage.sync.set({ settings });
            this.applySettingsToForm(settings);
        } catch (error) {
            this.logger.error('Error loading settings:', error);
            this.applySettingsToForm(this.defaultSettings);
        }
    }

    private applySettingsToForm(settings: Settings): void {
        // Priority weights
        (document.getElementById('gradeImpact') as HTMLInputElement).value = 
            (settings.priorityWeights.GRADE_IMPACT * 100).toString();
        (document.getElementById('courseGrade') as HTMLInputElement).value = 
            (settings.priorityWeights.COURSE_GRADE * 100).toString();
        (document.getElementById('dueDate') as HTMLInputElement).value = 
            (settings.priorityWeights.DUE_DATE * 100).toString();

        // Type weights
        (document.getElementById('quizWeight') as HTMLInputElement).value = 
            settings.typeWeights.quiz.toString();
        (document.getElementById('assignmentWeight') as HTMLInputElement).value = 
            settings.typeWeights.assignment.toString();
        (document.getElementById('discussionWeight') as HTMLInputElement).value = 
            settings.typeWeights.discussion.toString();
        (document.getElementById('announcementWeight') as HTMLInputElement).value = 
            settings.typeWeights.announcement.toString();

        // Display options
        (document.getElementById('showCourseNames') as HTMLInputElement).checked = 
            settings.displayOptions.showCourseNames;
        (document.getElementById('showGradeImpact') as HTMLInputElement).checked = 
            settings.displayOptions.showGradeImpact;
        (document.getElementById('showPriorityScores') as HTMLInputElement).checked = 
            settings.displayOptions.showPriorityScores;
        (document.getElementById('highlightOverdue') as HTMLInputElement).checked =
            settings.displayOptions.highlightOverdue;
        (document.getElementById('showOutsideCanvas') as HTMLInputElement).checked =
            settings.displayOptions.showOutsideCanvas;

        // Refresh interval
        (document.getElementById('refreshInterval') as HTMLInputElement).value = 
            settings.refreshInterval.toString();

        // iCal URL
        (document.getElementById('icalUrl') as HTMLInputElement).value = 
            settings.icalUrl;

        // Apply debug settings
        const debugSettings = settings.debugSettings;
        (document.getElementById('debugEnabled') as HTMLInputElement).checked = 
            debugSettings.enabled;
        (document.getElementById('logLevel') as HTMLSelectElement).value = 
            debugSettings.logLevel;
        (document.getElementById('showDateDebug') as HTMLInputElement).checked = 
            debugSettings.showDateDebug;
        (document.getElementById('showAssignmentDebug') as HTMLInputElement).checked = 
            debugSettings.showAssignmentDebug;
        (document.getElementById('showPriorityDebug') as HTMLInputElement).checked = 
            debugSettings.showPriorityDebug;

        // Update displays
        this.updateWeightDisplays();
        this.validateWeights();
    }

    private async saveSettings(): Promise<void> {
        if (!this.validateWeights()) {
            return;
        }

        try {
            const settings: Settings = {
                priorityWeights: {
                    GRADE_IMPACT: parseInt((document.getElementById('gradeImpact') as HTMLInputElement).value) / 100,
                    COURSE_GRADE: parseInt((document.getElementById('courseGrade') as HTMLInputElement).value) / 100,
                    DUE_DATE: parseInt((document.getElementById('dueDate') as HTMLInputElement).value) / 100
                },
                typeWeights: {
                    quiz: parseFloat((document.getElementById('quizWeight') as HTMLInputElement).value),
                    assignment: parseFloat((document.getElementById('assignmentWeight') as HTMLInputElement).value),
                    discussion: parseFloat((document.getElementById('discussionWeight') as HTMLInputElement).value),
                    announcement: parseFloat((document.getElementById('announcementWeight') as HTMLInputElement).value)
                },
                displayOptions: {
                    showCourseNames: (document.getElementById('showCourseNames') as HTMLInputElement).checked,
                    showGradeImpact: (document.getElementById('showGradeImpact') as HTMLInputElement).checked,
                    showPriorityScores: (document.getElementById('showPriorityScores') as HTMLInputElement).checked,
                    highlightOverdue: (document.getElementById('highlightOverdue') as HTMLInputElement).checked,
                    showOutsideCanvas: (document.getElementById('showOutsideCanvas') as HTMLInputElement).checked
                },
                refreshInterval: parseInt((document.getElementById('refreshInterval') as HTMLInputElement).value),
                debugSettings: {
                    enabled: (document.getElementById('debugEnabled') as HTMLInputElement).checked,
                    logLevel: (document.getElementById('logLevel') as HTMLSelectElement).value as Settings['debugSettings']['logLevel'],
                    showDateDebug: (document.getElementById('showDateDebug') as HTMLInputElement).checked,
                    showAssignmentDebug: (document.getElementById('showAssignmentDebug') as HTMLInputElement).checked,
                    showPriorityDebug: (document.getElementById('showPriorityDebug') as HTMLInputElement).checked
                },
                icalUrl: (document.getElementById('icalUrl') as HTMLInputElement).value
            };

            await chrome.storage.sync.set({ settings });
            await this.notifySettingsChanged(settings);
            this.showSaveSuccess();
        } catch (error) {
            this.logger.error('Error saving settings:', error);
            this.showSaveError();
        }
    }

    private async resetSettings(): Promise<void> {
        try {
            await chrome.storage.sync.set({ settings: this.defaultSettings });
            this.applySettingsToForm(this.defaultSettings);
            await this.notifySettingsChanged(this.defaultSettings);
            this.showSaveSuccess();
        } catch (error) {
            this.logger.error('Error resetting settings:', error);
            this.showSaveError();
        }
    }

    private validateWeights(): boolean {
        const gradeImpact = parseInt((document.getElementById('gradeImpact') as HTMLInputElement).value);
        const courseGrade = parseInt((document.getElementById('courseGrade') as HTMLInputElement).value);
        const dueDate = parseInt((document.getElementById('dueDate') as HTMLInputElement).value);
        const totalWeight = gradeImpact + courseGrade + dueDate;
        
        const validation = document.getElementById('weightValidation');
        if (validation) {
            if (totalWeight !== 100) {
                validation.textContent = `Total weight must be 100% (currently ${totalWeight}%)`;
                validation.className = 'weight-validation error';
                return false;
            } else {
                validation.textContent = '✓ Weights are valid';
                validation.className = 'weight-validation success';
                return true;
            }
        }
        return false;
    }

    private updateWeightDisplays(): void {
        ['gradeImpact', 'courseGrade', 'dueDate'].forEach(id => {
            const value = (document.getElementById(id) as HTMLInputElement).value;
            const display = document.getElementById(`${id}Value`);
            if (display) {
                display.textContent = `${value}%`;
            }
        });
    }

    private async notifySettingsChanged(settings: Settings): Promise<void> {
        try {
            // Notify background script
            await chrome.runtime.sendMessage({
                type: 'SETTINGS_UPDATED',
                settings
            });

            // Notify all tabs
            const tabs = await chrome.tabs.query({
                url: "*://*.instructure.com/*"
            });
            
            for (const tab of tabs) {
                if (tab.id) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            type: 'SETTINGS_UPDATED',
                            settings
                        });
                    } catch (e) {
                        // Ignore errors for tabs that don't have our content script
                        this.logger.debug(`Could not notify tab ${tab.id}: ${e}`);
                    }
                }
            }

            this.logger.info('Settings updated and propagated');
        } catch (error) {
            this.logger.error('Error notifying settings change:', error);
            throw error; // Re-throw to handle in the save function
        }
    }

    private showSaveSuccess(): void {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓ Saved';
            saveBtn.classList.add('success');
            setTimeout(() => {
                if (saveBtn) {
                    saveBtn.textContent = originalText;
                    saveBtn.classList.remove('success');
                }
            }, 2000);
        }
    }

    private showSaveError(): void {
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✗ Error';
            saveBtn.classList.add('error');
            setTimeout(() => {
                if (saveBtn) {
                    saveBtn.textContent = originalText;
                    saveBtn.classList.remove('error');
                }
            }, 2000);
        }
    }
}

// Initialize settings manager
window.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
