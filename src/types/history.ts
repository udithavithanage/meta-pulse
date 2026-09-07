export interface HistoryConfig {
	history: {
		filePath: string;
		keepLastN?: number;
	};
}

export interface HistoryEntry {
	topic: string;
	headline: string;
	postedAt: string;
}
