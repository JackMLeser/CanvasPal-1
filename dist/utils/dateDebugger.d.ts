interface DateMatch {
    element: HTMLElement;
    date: Date;
    type: 'due' | 'availability' | 'unlock' | 'unknown';
    text: string;
}
export declare class DateDebugger {
    private logger;
    private debugPanel;
    private debugManager;
    private static readonly DATE_DEBUG_STYLES;
    constructor();
    private injectDebugStyles;
    highlightDates(): DateMatch[];
    private findDatesInTextNodes;
    private updateDebugPanel;
    private getElementDescription;
    private processDateElement;
    private findDatesInText;
    private parseDate;
    private determineDateType;
    private applyDebugHighlight;
    private getDebugLabel;
    private containsDatePattern;
}
export {};
