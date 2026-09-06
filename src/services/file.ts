import fs from "node:fs";
import path from "node:path";

import type { LoggerService } from "~/services";

export class FileService {
	private _logger: LoggerService;

	public constructor(logger: LoggerService) {
		this._logger = logger;
	}

	public ensureDirectoryExistence(filePath: string): void {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			try {
				fs.mkdirSync(dir, { recursive: true });
				this._logger.debug(`Created directory: ${dir}`);
			} catch (err) {
				this._logger.error(
					`Failed to create directory ${dir}: ${(err as Error).message}`,
				);
				throw err;
			}
		}
	}

	public appendToFile(filePath: string, data: string): void {
		this.ensureDirectoryExistence(filePath);
		try {
			fs.appendFileSync(filePath, `${data}\n`, { encoding: "utf8" });
		} catch (err) {
			this._logger.error(
				`Failed to append to file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}

	public pathExists(filePath: string): boolean {
		return fs.existsSync(filePath);
	}

	public writeFile(filePath: string, data: string): void {
		this.ensureDirectoryExistence(filePath);
		try {
			fs.writeFileSync(filePath, data, { encoding: "utf8" });
		} catch (err) {
			this._logger.error(
				`Failed to write file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}

	public readFile(filePath: string, encoding: BufferEncoding = "utf8"): string {
		try {
			return fs.readFileSync(filePath, { encoding });
		} catch (err) {
			this._logger.error(
				`Failed to read file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}
}
