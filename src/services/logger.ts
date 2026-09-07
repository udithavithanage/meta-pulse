import fs from "node:fs";
import path from "node:path";

import { LogLevel } from "~/types";

/**
 * Service responsible for logging application events to a file and console.
 */
export class LoggerService {
	private _logFilePath: string;

	/**
	 * Creates an instance of LoggerService.
	 * @param logFilePath Path to the log file. Defaults to './logs/app.log'.
	 */
	public constructor(logFilePath: string = "./logs/app.log") {
		this._logFilePath = logFilePath;
	}

	/**
	 * Logs a message with the specified level.
	 * @param level The log level (DEBUG, INFO, WARN, ERROR).
	 * @param message The message to log.
	 */
	private _log(level: LogLevel, message: string): void {
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}] [${level}] ${message}`;

		console.log(logEntry);

		this._writeToFile(logEntry);
	}

	/**
	 * Writes a log entry to the file system.
	 * @param logEntry The string entry to append to the log file.
	 */
	private _writeToFile(logEntry: string): void {
		try {
			const dir = path.dirname(this._logFilePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}
			fs.appendFileSync(this._logFilePath, `${logEntry}\n`, {
				encoding: "utf8",
			});
		} catch (err) {
			console.error(`Failed to write to log file: ${(err as Error).message}`);
		}
	}

	/**
	 * Logs a debug message.
	 * @param message The message to log.
	 */
	public debug(message: string): void {
		this._log(LogLevel.DEBUG, message);
	}

	/**
	 * Logs an info message.
	 * @param message The message to log.
	 */
	public info(message: string): void {
		this._log(LogLevel.INFO, message);
	}

	/**
	 * Logs a warning message.
	 * @param message The message to log.
	 */
	public warn(message: string): void {
		this._log(LogLevel.WARN, message);
	}

	/**
	 * Logs an error message.
	 * @param message The message to log.
	 */
	public error(message: string): void {
		this._log(LogLevel.ERROR, message);
	}
}
