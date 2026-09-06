import type { AppConfig } from "~/types";

export class ConfigService {
	/**
	 * Loads and validates the application configuration from environment variables.
	 *
	 * @returns {AppConfig} The fully populated configuration object.
	 * @throws {Error} Terminates the process if any required configuration is missing or invalid.
	 */
	public load(): AppConfig {
		const config: AppConfig = {
			gemini: {
				apiKey: this._getRequired("GEMINI_API_KEY"),
				textModel: this._getRequired("GEMINI_TEXT_MODEL"),
				useGoogleSearchGrounding:
					this._getRequired("GEMINI_USE_GOOGLE_SEARCH_GROUNDING") === "true",
				topicPrompt: this._getRequired("GEMINI_TOPIC_PROMPT"),
			},
			content: {
				niche: this._getRequired("CONTENT_NICHE"),
				bannedTopics: this._getRequired("CONTENT_BANNED_TOPICS")
					.split(",")
					.map((s) => s.trim()),
				monetizationSafeMode:
					this._getRequired("CONTENT_MONETIZATION_SAFE_MODE") === "true",
				tone: this._getRequired("CONTENT_TONE"),
				language: this._getRequired("CONTENT_LANGUAGE"),
				contentGoals: this._getRequired("CONTENT_GOALS")
					.split(",")
					.map((s) => s.trim()),
			},
			image: {
				headline: {
					maxCharacters: this._getRequiredNumber(
						"IMAGE_HEADLINE_MAX_CHARACTERS",
					),
				},
				width: this._getRequiredNumber("IMAGE_WIDTH"),
				height: this._getRequiredNumber("IMAGE_HEIGHT"),
				promptTemplate: this._getRequired("IMAGE_PROMPT_TEMPLATE"),
			},
			output: {
				imagePath: this._getRequired("OUTPUT_IMAGE_PATH"),
			},
			caption: {
				callToActionOptions: this._getRequired("CAPTION_CALL_TO_ACTION_OPTIONS")
					.split(",")
					.map((s) => s.trim()),
				bannedPhrases: this._getRequired("CAPTION_BANNED_PHRASES")
					.split(",")
					.map((s) => s.trim()),
				includeCallToAction:
					this._getRequired("CAPTION_INCLUDE_CALL_TO_ACTION") === "true",
				minParagraphs: this._getRequiredNumber("CAPTION_MIN_PARAGRAPHS"),
				maxParagraphs: this._getRequiredNumber("CAPTION_MAX_PARAGRAPHS"),
				hashtagCount: this._getRequiredNumber("CAPTION_HASHTAG_COUNT"),
				fixedHashtags: this._getRequired("CAPTION_FIXED_HASHTAGS")
					.split(",")
					.map((s) => s.trim()),
			},
			facebook: {
				pageId: this._getRequired("FACEBOOK_PAGE_ID"),
				pageName: this._getRequired("FACEBOOK_PAGE_NAME"),
				accessToken: this._getRequired("FACEBOOK_ACCESS_TOKEN"),
				graphVersion: this._getRequired("GRAPH_API_VERSION"),
			},
			reliability: {
				requestTimeoutMs: this._getRequiredNumber(
					"RELIABILITY_REQUEST_TIMEOUT_MS",
				),
			},
			history: {
				filePath: this._getRequired("HISTORY_FILE_PATH"),
				keepLastN: this._getRequiredNumber("HISTORY_KEEP_LAST_N"),
			},
		};

		return config;
	}

	/**
	 * Retrieves a required environment variable.
	 *
	 * @param {string} key - The name of the environment variable.
	 * @returns {string} The value of the environment variable.
	 * @private
	 */
	private _getRequired(key: string): string {
		const value = process.env[key];
		if (!value) {
			console.error(`Missing required environment variable: ${key}`);
			process.exit(1);
		}
		return value;
	}

	/**
	 * Retrieves and parses a required environment variable as a number.
	 *
	 * @param {string} key - The name of the environment variable.
	 * @returns {number} The parsed numerical value.
	 * @private
	 */
	private _getRequiredNumber(key: string): number {
		const value = this._getRequired(key);
		const parsed = Number(value);
		if (Number.isNaN(parsed)) {
			console.error(`Invalid number for environment variable: ${key}`);
			process.exit(1);
		}
		return parsed;
	}
}
