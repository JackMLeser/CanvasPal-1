import { PerformanceLogger } from '../../src/utils/performanceLogger';
import { chrome } from 'jest-chrome';

describe('PerformanceLogger', () => {
    let performanceLogger: PerformanceLogger;
    const mockMetrics = [
        { name: 'operation1', duration: 100 },
        { name: 'operation2', duration: 200 }
    ];

    beforeEach(() => {
        performanceLogger = new PerformanceLogger();
        chrome.storage.local.get.mockImplementation(() => Promise.resolve({}));
        chrome.storage.local.set.mockImplementation(() => Promise.resolve());
        chrome.storage.local.remove.mockImplementation(() => Promise.resolve());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Log Management', () => {
        it('should save performance logs', async () => {
            await performanceLogger.logPerformance(mockMetrics);
            expect(chrome.storage.local.set).toHaveBeenCalled();
        });

        it('should retrieve performance logs', async () => {
            chrome.storage.local.get.mockImplementation(() => 
                Promise.resolve({ performanceLogs: [mockMetrics] })
            );

            const logs = await performanceLogger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toEqual(mockMetrics);
        });

        it('should limit the number of stored logs', async () => {
            const manyLogs = Array(150).fill(mockMetrics);
            chrome.storage.local.get.mockImplementation(() => 
                Promise.resolve({ performanceLogs: manyLogs })
            );

            await performanceLogger.logPerformance(mockMetrics);
            expect(chrome.storage.local.set).toHaveBeenCalled();
            const setCall = chrome.storage.local.set.mock.calls[0][0];
            expect(setCall.performanceLogs.length).toBeLessThanOrEqual(100);
        });

        it('should clear logs', async () => {
            await performanceLogger.clearLogs();
            expect(chrome.storage.local.remove).toHaveBeenCalled();
        });
    });

    describe('Performance Analysis', () => {
        const mockHistoricalMetrics = [
            [
                { name: 'op1', duration: 100 },
                { name: 'op2', duration: 150 }
            ],
            [
                { name: 'op1', duration: 120 },
                { name: 'op2', duration: 140 }
            ]
        ];

        beforeEach(() => {
            chrome.storage.local.get.mockImplementation(() => 
                Promise.resolve({ performanceLogs: mockHistoricalMetrics })
            );
        });

        it('should detect performance trends', async () => {
            const analysis = await performanceLogger.getPerformanceAnalysis();
            
            expect(analysis.trends).toBeDefined();
            expect(analysis.trends.length).toBeGreaterThan(0);
            expect(analysis.trends[0]).toHaveProperty('trend');
            expect(analysis.trends[0]).toHaveProperty('percentageChange');
        });

        it('should identify performance hotspots', async () => {
            const analysis = await performanceLogger.getPerformanceAnalysis();
            
            expect(analysis.hotspots).toBeDefined();
            expect(analysis.hotspots.length).toBeGreaterThan(0);
            expect(analysis.hotspots[0]).toHaveProperty('frequency');
            expect(analysis.hotspots[0]).toHaveProperty('averageDuration');
        });

        it('should generate recommendations', async () => {
            const analysis = await performanceLogger.getPerformanceAnalysis();
            
            expect(analysis.recommendations).toBeDefined();
            expect(analysis.recommendations.length).toBeGreaterThan(0);
            expect(typeof analysis.recommendations[0]).toBe('string');
        });

        it('should handle insufficient data gracefully', async () => {
            chrome.storage.local.get.mockImplementation(() => 
                Promise.resolve({ performanceLogs: [mockMetrics] })
            );

            const analysis = await performanceLogger.getPerformanceAnalysis();
            expect(analysis.recommendations).toContain('Not enough data for analysis');
        });
    });

    describe('Error Handling', () => {
        it('should handle storage errors when saving logs', async () => {
            chrome.storage.local.set.mockImplementation(() => 
                Promise.reject(new Error('Storage error'))
            );

            await performanceLogger.logPerformance(mockMetrics);
            // Should not throw, just log the error
        });

        it('should handle storage errors when retrieving logs', async () => {
            chrome.storage.local.get.mockImplementation(() => 
                Promise.reject(new Error('Storage error'))
            );

            const logs = await performanceLogger.getLogs();
            expect(logs).toEqual([]);
        });

        it('should handle storage errors when clearing logs', async () => {
            chrome.storage.local.remove.mockImplementation(() => 
                Promise.reject(new Error('Storage error'))
            );

            await performanceLogger.clearLogs();
            // Should not throw, just log the error
        });
    });
});