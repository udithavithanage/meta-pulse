import type { FileService, LoggerService } from "~/services";
import type { HistoryConfig, HistoryEntry } from "~/types";

export class HistoryService {
	private _config: HistoryConfig;
	private _fileService: FileService;
	private _logger: LoggerService;

	public constructor(
		config: HistoryConfig,
		fileService: FileService,
		logger: LoggerService,
	) {
		this._config = config;
		this._fileService = fileService;
		this._logger = logger;
	}

	private _ensureFile(): void {
		const filePath = this._config.history.filePath;
		if (!this._fileService.pathExists(filePath)) {
			this._logger.info(`Initializing history file at ${filePath}`);
			this._fileService.writeFile(filePath, JSON.stringify([], null, 2));
		}
	}

	public loadHistory(): HistoryEntry[] {
		try {
			this._ensureFile();
			const filePath = this._config.history.filePath;
			const raw = this._fileService.readFile(filePath);
			return JSON.parse(raw);
		} catch (err) {
			this._logger.error(
				`Failed to load history file: ${(err as Error).message}`,
			);
			// If corrupted or unreadable, we might want to return empty to allow continue
			return [];
		}
	}

	public getRecentTopics(): string[] {
		const history = this.loadHistory();
		return history.map((entry) => entry.topic);
	}

	public addEntry({
		topic,
		headline,
	}: {
		topic: string;
		headline: string;
	}): void {
		try {
			const history = this.loadHistory();

			history.push({
				topic,
				headline,
				postedAt: new Date().toISOString(),
			});

			const keepLastN = this._config.history.keepLastN;
			const trimmed = keepLastN ? history.slice(-keepLastN) : history;

			this._fileService.writeFile(
				this._config.history.filePath,
				JSON.stringify(trimmed, null, 2),
			);
			this._logger.info(`Added entry to history: ${topic}`);
		} catch (err) {
			this._logger.error(
				`Failed to add entry to history: ${(err as Error).message}`,
			);
			throw err; // Re-throw to inform caller
		}
	}
}
