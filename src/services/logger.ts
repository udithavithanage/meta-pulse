import fs from "node:fs";
import path from "node:path";

import { LogLevel } from "~/types";

export class LoggerService {
	private _logFilePath: string;

	public constructor(logFilePath: string = "./logs/app.log") {
		this._logFilePath = logFilePath;
	}

	private _log(level: LogLevel, message: string): void {
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}] [${level}] ${message}`;

		console.log(logEntry);

		this._writeToFile(logEntry);
	}

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

	public debug(message: string): void {
		this._log(LogLevel.DEBUG, message);
	}

	public info(message: string): void {
		this._log(LogLevel.INFO, message);
	}

	public warn(message: string): void {
		this._log(LogLevel.WARN, message);
	}

	public error(message: string): void {
		this._log(LogLevel.ERROR, message);
	}
}
