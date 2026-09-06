import fs from "node:fs";
import path from "node:path";
import type { LoggerService } from "~/services/logger";

export class FileService {
	private logger: LoggerService;

	constructor(logger: LoggerService) {
		this.logger = logger;
	}

	ensureDirectoryExistence(filePath: string) {
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			try {
				fs.mkdirSync(dir, { recursive: true });
				this.logger.debug(`Created directory: ${dir}`);
			} catch (err) {
				this.logger.error(
					`Failed to create directory ${dir}: ${(err as Error).message}`,
				);
				throw err;
			}
		}
	}

	appendToFile(filePath: string, data: string) {
		this.ensureDirectoryExistence(filePath);
		try {
			fs.appendFileSync(filePath, `${data}\n`, { encoding: "utf8" });
		} catch (err) {
			this.logger.error(
				`Failed to append to file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}

	pathExists(filePath: string): boolean {
		return fs.existsSync(filePath);
	}

	writeFile(filePath: string, data: string) {
		this.ensureDirectoryExistence(filePath);
		try {
			fs.writeFileSync(filePath, data, { encoding: "utf8" });
		} catch (err) {
			this.logger.error(
				`Failed to write file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}

	readFile(filePath: string, encoding: BufferEncoding = "utf8"): string {
		try {
			return fs.readFileSync(filePath, { encoding });
		} catch (err) {
			this.logger.error(
				`Failed to read file ${filePath}: ${(err as Error).message}`,
			);
			throw err;
		}
	}
}
