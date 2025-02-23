import { chrome } from 'jest-chrome';

describe('Settings Management', () => {
    beforeEach(() => {
        chrome.storage.sync.clear();
    });

    test('saves settings correctly', async () => {
        const settings = {
            icalUrl: 'https://example.com/calendar.ics',
            priorities: {
                dueDate: 0.4,
                gradeWeight: 0.3,
                gradeImpact: 0.3
            },
            refreshInterval: 30
        };

        await chrome.storage.sync.set({ settings });
        const result = await chrome.storage.sync.get('settings');
        expect(result.settings).toEqual(settings);
    });
});