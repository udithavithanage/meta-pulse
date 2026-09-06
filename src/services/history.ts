import type { FileService } from "~/services/file";
import type { LoggerService } from "~/services/logger";

import type { HistoryConfig, HistoryEntry } from "~/types";

export class HistoryService {
  private config: HistoryConfig;
  private fileService: FileService;
  private logger: LoggerService;

  constructor(
    config: HistoryConfig,
    fileService: FileService,
    logger: LoggerService,
  ) {
    this.config = config;
    this.fileService = fileService;
    this.logger = logger;
  }

  #ensureFile(): void {
    const filePath = this.config.history.filePath;
    if (!this.fileService.pathExists(filePath)) {
      this.logger.info(`Initializing history file at ${filePath}`);
      this.fileService.writeFile(filePath, JSON.stringify([], null, 2));
    }
  }

  loadHistory(): HistoryEntry[] {
    try {
      this.#ensureFile();
      const filePath = this.config.history.filePath;
      const raw = this.fileService.readFile(filePath);
      return JSON.parse(raw);
    } catch (err) {
      this.logger.error(
        `Failed to load history file: ${(err as Error).message}`,
      );
      // If corrupted or unreadable, we might want to return empty to allow continue
      return [];
    }
  }

  getRecentTopics(): string[] {
    const history = this.loadHistory();
    return history.map((entry) => entry.topic);
  }

  addEntry({ topic, headline }: { topic: string; headline: string }): void {
    try {
      const history = this.loadHistory();

      history.push({
        topic,
        headline,
        postedAt: new Date().toISOString(),
      });

      const keepLastN = this.config.history.keepLastN;
      const trimmed = keepLastN ? history.slice(-keepLastN) : history;

      this.fileService.writeFile(
        this.config.history.filePath,
        JSON.stringify(trimmed, null, 2),
      );
      this.logger.info(`Added entry to history: ${topic}`);
    } catch (err) {
      this.logger.error(
        `Failed to add entry to history: ${(err as Error).message}`,
      );
      throw err; // Re-throw to inform caller
    }
  }
}
