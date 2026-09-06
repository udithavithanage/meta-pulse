export interface GeminiConfig {
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
}

export interface TopicPlan {
	topic: string;
	headline: string;
	visualHint: string;
	angle: string;
}
