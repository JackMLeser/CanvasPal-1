export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = 'info';
    private enabled: boolean = false;

    protected constructor() {}

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public enable(): void {
        this.enabled = true;
    }

    public disable(): void {
        this.enabled = false;
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.enabled) return false;

        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }

    public info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }

    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    public error(message: string, ...args: any[]): void {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }

    public group(name: string): void {
        if (this.enabled) {
            console.group(name);
        }
    }

    public groupEnd(): void {
        if (this.enabled) {
            console.groupEnd();
        }
    }

    public table(data: any[]): void {
        if (this.enabled) {
            console.table(data);
        }
    }
}

export const logger = Logger.getInstance();
