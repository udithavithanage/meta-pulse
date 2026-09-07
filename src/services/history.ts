import type { FileService, LoggerService } from "~/services";
import type { HistoryConfig, HistoryEntry } from "~/types";

/**
 * Service responsible for managing the history of generated content entries.
 */
export class HistoryService {
	private _config: HistoryConfig;
	private _fileService: FileService;
	private _logger: LoggerService;

	/**
	 * Creates an instance of HistoryService.
	 * @param config Configuration for history management.
	 * @param fileService File service instance for file operations.
	 * @param logger Logger service instance.
	 */
	public constructor(
		config: HistoryConfig,
		fileService: FileService,
		logger: LoggerService,
	) {
		this._config = config;
		this._fileService = fileService;
		this._logger = logger;
	}

	/**
	 * Ensures the history file exists, initializing it if it doesn't.
	 */
	private _ensureFile(): void {
		const filePath = this._config.history.filePath;
		if (!this._fileService.pathExists(filePath)) {
			this._logger.info(`Initializing history file at ${filePath}`);
			this._fileService.writeFile(filePath, JSON.stringify([], null, 2));
		}
	}

	/**
	 * Loads all history entries from the history file.
	 * @returns An array of history entries.
	 */
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

	/**
	 * Gets the list of recent topics from the history.
	 * @returns An array of topics.
	 */
	public getRecentTopics(): string[] {
		const history = this.loadHistory();
		return history.map((entry) => entry.topic);
	}

	/**
	 * Adds a new entry to the history and trims to keep only the last N entries.
	 * @param entry The history entry to add.
	 * @param entry.topic The topic of the post.
	 * @param entry.headline The headline of the post.
	 */
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
