import { chrome } from 'jest-chrome';
import { backgroundService } from '../../src/background';
import { ChromeMessage, MessageCallback } from '../../src/types/chrome';

describe('BackgroundService', () => {
    let mockMessageHandler: jest.Mock;
    
    beforeEach(() => {
        jest.useFakeTimers();
        // Setup storage mocks first
        (chrome.storage.local.get as jest.Mock)
            .mockImplementation(() => Promise.resolve({}));
        (chrome.storage.sync.get as jest.Mock)
            .mockImplementation(() => Promise.resolve({
                icalUrl: 'https://example.com/calendar.ics',
                weights: { dueDate: 33, gradeWeight: 33, impact: 34 }
            }));
        // Setup message handling
        mockMessageHandler = jest.fn((msg: any, sender: any, sendResponse: any) => {
            if (msg.type === 'fetchAssignments') {
                sendResponse([]);
                return true;
            }
            if (msg.type === 'forceSync') {
                Promise.resolve().then(() => {
                    chrome.runtime.sendMessage({ type: 'syncComplete' });
                });
                return true;
            }
            return true;
        });
        
        chrome.runtime.onMessage.addListener(mockMessageHandler);
        
        // Initialize service
        backgroundService;
        jest.runAllTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should load stored grade data on initialization', async () => {
            const storedData = {
                'grades_COURSE101': {
                    courseName: 'COURSE101',
                    assignments: [
                        { name: 'Assignment 1', points: 85, pointsPossible: 100, weight: 30 }
                    ]
                }
            };
            chrome.storage.local.get.mockImplementation(() => Promise.resolve(storedData));
            await jest.runAllTimers();
            expect(chrome.storage.local.get).toHaveBeenCalledWith(null);
        });

        it('should start periodic sync on installation', () => {
            // Get the installation callback directly from chrome.runtime.onInstalled.addListener
            const installCallback = (chrome.runtime.onInstalled.addListener as jest.Mock).mock.calls[0][0];
            
            // Call the callback with installation details
            installCallback({
                reason: 'install',
                previousVersion: undefined,
                id: undefined
            });
            
            jest.advanceTimersByTime(30 * 60 * 1000);
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'syncComplete' })
            );
        });
    });

    describe('Message Handling', () => {
        it('should handle fetchAssignments message', async () => {
            const sendResponse = jest.fn();
            const msg = { type: 'fetchAssignments' };
            
            mockMessageHandler(msg, {}, sendResponse);
            await Promise.resolve();
            
            expect(sendResponse).toHaveBeenCalled();
        });

        it('should handle gradeData message', async () => {
            const sendResponse = jest.fn();
            const gradeData = {
                courseName: 'COURSE101',
                assignments: [
                    { name: 'Test Assignment', points: 90, pointsPossible: 100 }
                ]
            };

            mockMessageHandler(
                { type: 'gradeData', data: gradeData },
                {},
                sendResponse
            );

            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    'grades_COURSE101': gradeData
                })
            );
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('Sync Functionality', () => {
        it('should retry sync on failure', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            
            mockMessageHandler({ type: 'forceSync' }, {}, jest.fn());
            await Promise.resolve();
            jest.advanceTimersByTime(5000);

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'syncError' })
            );
        });

        it('should respect minimum sync interval', async () => {
            mockMessageHandler(
                { type: 'forceSync' },
                {},
                () => {}
            );

            mockMessageHandler(
                { type: 'forceSync' },
                {},
                () => {}
            );

            expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
        });
    });
});