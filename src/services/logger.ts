import fs from "node:fs";
import path from "node:path";

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
}

export class LoggerService {
	private logFilePath: string;

	constructor(logFilePath: string = "./logs/app.log") {
		this.logFilePath = logFilePath;
	}

	private log(level: LogLevel, message: string): void {
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}] [${level}] ${message}`;

		console.log(logEntry);

		this.writeToFile(logEntry);
	}

	private writeToFile(logEntry: string): void {
		try {
			const dir = path.dirname(this.logFilePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.appendFileSync(this.logFilePath, `${logEntry}\n`, { encoding: "utf8" });
		} catch (err) {
			console.error(`Failed to write to log file: ${(err as Error).message}`);
		}
	}

	public debug(message: string): void {
		this.log(LogLevel.DEBUG, message);
	}

	public info(message: string): void {
		this.log(LogLevel.INFO, message);
	}

	public warn(message: string): void {
		this.log(LogLevel.WARN, message);
	}

	public error(message: string): void {
		this.log(LogLevel.ERROR, message);
	}
}
