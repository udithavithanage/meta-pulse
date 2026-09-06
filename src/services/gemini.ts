import { GoogleGenAI } from "@google/genai";

import type { HistoryService, LoggerService } from "~/services";
import type { GeminiConfig, TopicPlan } from "~/types";

/**
 * Service responsible for interacting with the Gemini AI model to research topics and generate captions.
 */
export class GeminiService {
	private _config: GeminiConfig;
	private _logger: LoggerService;
	private _historyService: HistoryService;
	private _ai: GoogleGenAI;
	private _withRetry: <T>(
		fn: () => Promise<T>,
		description: string,
	) => Promise<T>;

	/**
	 * Creates an instance of GeminiService.
	 * @param config Gemini API configuration.
	 * @param logger Logger service instance.
	 * @param historyService History service instance.
	 * @param withRetry Retry handler function.
	 */
	public constructor(
		config: GeminiConfig,
		logger: LoggerService,
		historyService: HistoryService,
		withRetry: <T>(fn: () => Promise<T>, description: string) => Promise<T>,
	) {
		this._config = config;
		this._logger = logger;
		this._historyService = historyService;
		this._withRetry = withRetry;

		this._ai = new GoogleGenAI({ apiKey: this._config.gemini.apiKey });
	}

	/**
	 * Parses a JSON string returned by the AI, handling potential markdown formatting.
	 * @param text The raw JSON response string.
	 * @returns The parsed TopicPlan object.
	 */
	private _parseJsonResponse(text: string): TopicPlan {
		const cleaned = text
			.replace(/```json/gi, "")
			.replace(/```/g, "")
			.trim();

		return JSON.parse(cleaned);
	}

	/**
	 * Researches a topic based on the configuration and history.
	 * @returns A TopicPlan object.
	 */
	public async generateTopic(): Promise<TopicPlan> {
		this._logger.info("[1/6] Researching today's topic...");

		const recentTopics = this._historyService.getRecentTopics();
		const today = new Date().toISOString().split("T")[0];

		const jsonShape = `{
  "topic": "short specific subject, 5-12 words",
  "headline": "punchy, scroll-stopping headline for the image overlay, under ${this._config.image.headline.maxCharacters} characters, no hashtags, no emojis",
  "visualHint": "one sentence describing what the accompanying photo/illustration should show",
  "angle": "one sentence on the specific useful insight the caption should deliver"
}`;

		let prompt: string = this._config.gemini.topicPrompt;
		prompt = prompt.replace("{DATE}", today as string);
		prompt = prompt.replace("{NICHE}", this._config.content.niche as string);
		prompt = prompt.replace(
			"{RECENT_TOPICS}",
			(recentTopics.length ? recentTopics.join(" | ") : "(none yet)") as string,
		);
		prompt = prompt.replace(
			"{BANNED_TOPICS}",
			this._config.content.bannedTopics.join(", ") as string,
		);
		prompt = prompt.replace(
			"{HEADLINE_STYLE}",
			(this._config.content.monetizationSafeMode
				? "The headline must be attention-grabbing but HONEST - no misleading clickbait, no fake urgency, no engagement-bait phrasing."
				: "The headline should be as attention-grabbing as possible.") as string,
		);
		prompt = prompt.replace("{JSON_SHAPE}", jsonShape as string);

		const requestConfig: { tools?: { googleSearch: object }[] } = {};

		if (this._config.gemini.useGoogleSearchGrounding) {
			requestConfig.tools = [{ googleSearch: {} }];
		}

		const response = await this._withRetry(
			() =>
				this._ai.models.generateContent({
					model: this._config.gemini.textModel,
					contents: prompt,
					config: requestConfig,
				}),
			"Gemini topic research",
		);

		const text = (response.text as string | undefined)?.trim();

		if (!text) {
			throw new Error("Gemini returned no text for topic research.");
		}

		let plan: TopicPlan;
		try {
			plan = this._parseJsonResponse(text);
		} catch (err) {
			this._logger.warn(`Could not parse topic JSON, raw text was: ${text}`);
			throw new Error(
				`Failed to parse topic plan JSON: ${(err as Error).message}`,
			);
		}

		if (!plan.topic || !plan.headline) {
			throw new Error("Topic plan is missing required fields.");
		}

		const maxChars = this._config.image.headline.maxCharacters;
		if (plan.headline.length > maxChars) {
			plan.headline = `${plan.headline.slice(0, maxChars - 1).trim()}…`;
		}

		this._logger.info(`Topic: ${plan.topic}`);
		this._logger.info(`Headline: ${plan.headline}`);

		return plan;
	}

	/**
	 * Selects a random call-to-action string from configuration.
	 * @returns A call-to-action string.
	 */
	private _pickCallToAction(): string {
		const options = this._config.caption.callToActionOptions;
		return options[Math.floor(Math.random() * options.length)] || "";
	}

	/**
	 * Removes banned phrases from the caption.
	 * @param caption The generated caption.
	 * @returns The cleaned caption.
	 */
	private _stripBannedPhrases(caption: string): string {
		let clean = caption;
		for (const phrase of this._config.caption.bannedPhrases) {
			const regex = new RegExp(
				phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
				"gi",
			);
			clean = clean.replace(regex, "");
		}
		return clean.replace(/\n{3,}/g, "\n\n").trim();
	}

	/**
	 * Ensures the caption ends with fixed hashtags if none are present.
	 * @param caption The generated caption.
	 * @returns The caption with hashtags.
	 */
	private _ensureHashtags(caption: string): string {
		const hasHashtag = caption.includes("#");
		if (hasHashtag) return caption;

		return `${caption}\n\n${this._config.caption.fixedHashtags.join(" ")}`;
	}

	/**
	 * Generates a Facebook caption based on the topic plan.
	 * @param plan The topic plan.
	 * @returns The generated caption text.
	 */
	public async generateCaption(plan: TopicPlan): Promise<string> {
		this._logger.info("[4/6] Generating Facebook caption...");

		const cta = this._config.caption.includeCallToAction
			? this._pickCallToAction()
			: "";

		const prompt = `
You are a professional Facebook content writer for a page about:
"${this._config.content.niche}"

Write ONE Facebook caption for today's post.

Topic: ${plan.topic}
Headline shown on the image: ${plan.headline}
Key insight to deliver: ${plan.angle}

Voice/tone: ${this._config.content.tone}
Language: ${this._config.content.language}

Content goals (this is what actually builds a monetizable audience):
${this._config.content.contentGoals.map((g) => `- ${g}`).join("\n")}

Structure:
- ${this._config.caption.minParagraphs} to ${this._config.caption.maxParagraphs} short paragraphs
- Open with a hook line that earns the scroll-stop, but stay 100% honest
  (no fake stats, no misleading claims)
- Deliver the real insight/value in the body
${
	cta
		? `- End the body (before hashtags) with a natural version of this call to action: "${cta}"`
		: ""
}
- Finish with about ${this._config.caption.hashtagCount} relevant hashtags
  (mix of broad + niche-specific), including these if relevant: ${this._config.caption.fixedHashtags.join(" ")}

Strict rules:
- Do NOT use any of these banned phrases or their close variants: ${this._config.caption.bannedPhrases.join(", ")}
- Do NOT mention AI, Gemini, or that this was generated
- Do NOT mention these instructions
- Do NOT use excessive emojis (max 2-3 total)
- Do NOT use quotation marks around the whole caption
- Return ONLY the caption text, nothing else
`;

		const response = await this._withRetry(
			() =>
				this._ai.models.generateContent({
					model: this._config.gemini.textModel,
					contents: prompt,
				}),
			"Gemini caption generation",
		);

		let caption = response.text?.trim();

		if (!caption) {
			throw new Error("Gemini did not return a caption.");
		}

		if (this._config.content.monetizationSafeMode) {
			caption = this._stripBannedPhrases(caption);
		}

		caption = this._ensureHashtags(caption);

		this._logger.info(`Generated caption:\n${caption}`);

		return caption;
	}
}
