export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
    stack?: string;
}
export declare class Logger {
    private static readonly MAX_LOGS;
    private static instances;
    private context;
    private currentLevel;
    constructor(context: string, level?: LogLevel);
    static getInstance(context: string, level?: LogLevel): Logger;
    setLevel(level: LogLevel): void;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    log(level: LogLevel, message: string, ...args: any[]): Promise<void>;
    private getLogPrefix;
    private formatLogData;
    private saveLogs;
    private cleanOldLogs;
    private notifyError;
    getLogs(level?: LogLevel): Promise<LogEntry[]>;
}
export declare const logger: Logger;
export {};
