import type { FacebookConfig, ReliabilityConfig } from "./facebook";

export interface AppConfig {
	gemini: {
		apiKey: string;
		textModel: string;
		useGoogleSearchGrounding: boolean;
		topicPrompt: string;
	};
	content: {
		niche: string;
		bannedTopics: string[];
		monetizationSafeMode: boolean;
		tone: string;
		language: string;
		contentGoals: string[];
	};
	image: {
		headline: {
			maxCharacters: number;
		};
		width: number;
		height: number;
		promptTemplate: string;
	};
	output: {
		imagePath: string;
	};
	caption: {
		callToActionOptions: string[];
		bannedPhrases: string[];
		includeCallToAction: boolean;
		minParagraphs: number;
		maxParagraphs: number;
		hashtagCount: number;
		fixedHashtags: string[];
	};
	facebook: FacebookConfig;
	reliability: ReliabilityConfig;
	history: {
		filePath: string;
		keepLastN: number;
	};
}
