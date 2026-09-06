import fs from "node:fs";
import path from "node:path";

import type { LoggerService } from "~/services";

/**
 * Service responsible for performing file system operations.
 */
export class FileService {
	private _logger: LoggerService;

	/**
	 * Creates an instance of FileService.
	 * @param logger Logger service instance.
	 */
	public constructor(logger: LoggerService) {
		this._logger = logger;
	}

	/**
	 * Ensures the directory for a given file path exists.
	 * @param filePath The path of the file.
	 */
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

	/**
	 * Appends data to a file.
	 * @param filePath The path of the file.
	 * @param data The data to append.
	 */
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

	/**
	 * Checks if a file or directory exists.
	 * @param filePath The path to check.
	 * @returns True if exists, false otherwise.
	 */
	public pathExists(filePath: string): boolean {
		return fs.existsSync(filePath);
	}

	/**
	 * Writes data to a file, overwriting if it exists.
	 * @param filePath The path of the file.
	 * @param data The data to write.
	 */
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

	/**
	 * Reads data from a file.
	 * @param filePath The path of the file.
	 * @param encoding The character encoding to use. Defaults to "utf8".
	 * @returns The file contents as a string.
	 */
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
