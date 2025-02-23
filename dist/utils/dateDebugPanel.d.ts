interface DateDebugInfo {
    totalDates: number;
    types: {
        due: number;
        availability: number;
        unlock: number;
        unknown: number;
    };
    detections: {
        element: string;
        text: string;
        type: string;
        date: string;
    }[];
}
export declare class DateDebugPanel {
    private panel;
    private logger;
    private debugManager;
    private isVisible;
    constructor(debugManager: {
        isDebugEnabled(): boolean;
    });
    private initializeKeyboardShortcut;
    private createPanel;
    toggleVisibility(): void;
    updateDebugInfo(info: DateDebugInfo): void;
    private renderTypeDistribution;
    private renderDetections;
    logDateDetection(message: string, data?: any): void;
}
export {};
