export enum LogLevel {
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

export class Logger {
    private static readonly MAX_LOGS = 1000;
    private static instances: Map<string, Logger> = new Map();
    private context: string;
    private currentLevel: LogLevel;

    public constructor(context: string, level: LogLevel = LogLevel.INFO) {
        this.context = context;
        this.currentLevel = level;
        this.cleanOldLogs();
    }

    public static getInstance(context: string, level: LogLevel = LogLevel.INFO): Logger {
        const key = `${context}-${level}`;
        if (!this.instances.has(key)) {
            this.instances.set(key, new Logger(context, level));
        }
        return this.instances.get(key)!;
    }

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    error(message: string, data?: any): void {
        this.log(LogLevel.ERROR, message, data);
    }

    public async log(level: LogLevel, message: string, ...args: any[]): Promise<void> {
        if (level >= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const prefix = this.getLogPrefix(level);
            const formattedMessage = `[${timestamp}] ${prefix} [${this.context}] ${message}`;

            if (args.length) {
                const formattedData = this.formatLogData(args);
                console.log(formattedMessage, formattedData);
            } else {
                console.log(formattedMessage);
            }

            const entry: LogEntry = {
                timestamp,
                level,
                message,
                data: args,
                stack: Error().stack
            };

            this.saveLogs(entry);

            if (level === LogLevel.ERROR) {
                this.notifyError(entry);
            }
        }
    }

    private getLogPrefix(level: LogLevel): string {
        switch (level) {
            case LogLevel.DEBUG:
                return '🔍 DEBUG:';
            case LogLevel.INFO:
                return '📢 INFO:';
            case LogLevel.WARN:
                return '⚠️ WARN:';
            case LogLevel.ERROR:
                return '❌ ERROR:';
            default:
                return '📢';
        }
    }

    private formatLogData(data: any): any {
        try {
            if (Array.isArray(data)) {
                return data.map(item => this.formatLogData(item));
            }

            if (data && typeof data === 'object') {
                // Check if it's an Error object
                if (data instanceof Error) {
                    return {
                        name: data.name,
                        message: data.message,
                        stack: data.stack
                    };
                }

                // Handle regular objects
                const formatted: Record<string, any> = {};
                for (const [key, value] of Object.entries(data)) {
                    formatted[key] = this.formatLogData(value);
                }
                return formatted;
            }

            return data;
        } catch (error) {
            return '[Error formatting log data]';
        }
    }

    private async saveLogs(entry: LogEntry): Promise<void> {
        const { logs = [] } = await chrome.storage.local.get('logs');
        logs.push(entry);

        if (logs.length > Logger.MAX_LOGS) {
            logs.splice(0, logs.length - Logger.MAX_LOGS);
        }

        await chrome.storage.local.set({ logs });
    }

    private async cleanOldLogs(): Promise<void> {
        const { logs = [] } = await chrome.storage.local.get('logs');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const filteredLogs = logs.filter((log: LogEntry) => 
            new Date(log.timestamp) > thirtyDaysAgo
        );

        await chrome.storage.local.set({ logs: filteredLogs });
    }

    private notifyError(entry: LogEntry): void {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '/dist/icons/icon128.png',
            title: 'CanvasPal Error',
            message: entry.message,
            priority: 2
        });
    }

    async getLogs(level?: LogLevel): Promise<LogEntry[]> {
        const { logs = [] } = await chrome.storage.local.get('logs');
        return level ? logs.filter((log: LogEntry) => log.level === level) : logs;
    }
}

export const logger = Logger.getInstance('default');
