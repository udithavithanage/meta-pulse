import { GoogleGenAI } from "@google/genai";

import type { HistoryService, LoggerService } from "~/services";
import type { GeminiConfig, TopicPlan } from "~/types";

export class GeminiService {
	private config: GeminiConfig;
	private logger: LoggerService;
	private historyService: HistoryService;
	private ai: GoogleGenAI;
	private withRetry: <T>(
		fn: () => Promise<T>,
		description: string,
	) => Promise<T>;

	constructor(
		config: GeminiConfig,
		logger: LoggerService,
		historyService: HistoryService,
		withRetry: <T>(fn: () => Promise<T>, description: string) => Promise<T>,
	) {
		this.config = config;
		this.logger = logger;
		this.historyService = historyService;
		this.withRetry = withRetry;

		this.ai = new GoogleGenAI({ apiKey: this.config.gemini.apiKey });
	}

	private parseJsonResponse(text: string): TopicPlan {
		const cleaned = text
			.replace(/```json/gi, "")
			.replace(/```/g, "")
			.trim();

		return JSON.parse(cleaned);
	}

	async generateTopic(): Promise<TopicPlan> {
		this.logger.info("[1/6] Researching today's topic...");

		const recentTopics = this.historyService.getRecentTopics();
		const today = new Date().toISOString().split("T")[0];

		const jsonShape = `{
  "topic": "short specific subject, 5-12 words",
  "headline": "punchy, scroll-stopping headline for the image overlay, under ${this.config.image.headline.maxCharacters} characters, no hashtags, no emojis",
  "visualHint": "one sentence describing what the accompanying photo/illustration should show",
  "angle": "one sentence on the specific useful insight the caption should deliver"
}`;

		let prompt: string = this.config.gemini.topicPrompt;
		prompt = prompt.replace("{DATE}", today as string);
		prompt = prompt.replace("{NICHE}", this.config.content.niche as string);
		prompt = prompt.replace(
			"{RECENT_TOPICS}",
			(recentTopics.length ? recentTopics.join(" | ") : "(none yet)") as string,
		);
		prompt = prompt.replace(
			"{BANNED_TOPICS}",
			this.config.content.bannedTopics.join(", ") as string,
		);
		prompt = prompt.replace(
			"{HEADLINE_STYLE}",
			(this.config.content.monetizationSafeMode
				? "The headline must be attention-grabbing but HONEST - no misleading clickbait, no fake urgency, no engagement-bait phrasing."
				: "The headline should be as attention-grabbing as possible.") as string,
		);
		prompt = prompt.replace("{JSON_SHAPE}", jsonShape as string);

		const requestConfig: { tools?: { googleSearch: object }[] } = {};

		if (this.config.gemini.useGoogleSearchGrounding) {
			requestConfig.tools = [{ googleSearch: {} }];
		}

		const response = await this.withRetry(
			() =>
				this.ai.models.generateContent({
					model: this.config.gemini.textModel,
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
			plan = this.parseJsonResponse(text);
		} catch (err) {
			this.logger.warn(`Could not parse topic JSON, raw text was: ${text}`);
			throw new Error(
				`Failed to parse topic plan JSON: ${(err as Error).message}`,
			);
		}

		if (!plan.topic || !plan.headline) {
			throw new Error("Topic plan is missing required fields.");
		}

		const maxChars = this.config.image.headline.maxCharacters;
		if (plan.headline.length > maxChars) {
			plan.headline = `${plan.headline.slice(0, maxChars - 1).trim()}…`;
		}

		this.logger.info(`Topic: ${plan.topic}`);
		this.logger.info(`Headline: ${plan.headline}`);

		return plan;
	}

	private pickCallToAction(): string {
		const options = this.config.caption.callToActionOptions;
		return options[Math.floor(Math.random() * options.length)] || "";
	}

	private stripBannedPhrases(caption: string): string {
		let clean = caption;
		for (const phrase of this.config.caption.bannedPhrases) {
			const regex = new RegExp(
				phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
				"gi",
			);
			clean = clean.replace(regex, "");
		}
		return clean.replace(/\n{3,}/g, "\n\n").trim();
	}

	private ensureHashtags(caption: string): string {
		const hasHashtag = caption.includes("#");
		if (hasHashtag) return caption;

		return `${caption}\n\n${this.config.caption.fixedHashtags.join(" ")}`;
	}

	async generateCaption(plan: TopicPlan): Promise<string> {
		this.logger.info("[4/6] Generating Facebook caption...");

		const cta = this.config.caption.includeCallToAction
			? this.pickCallToAction()
			: "";

		const prompt = `
You are a professional Facebook content writer for a page about:
"${this.config.content.niche}"

Write ONE Facebook caption for today's post.

Topic: ${plan.topic}
Headline shown on the image: ${plan.headline}
Key insight to deliver: ${plan.angle}

Voice/tone: ${this.config.content.tone}
Language: ${this.config.content.language}

Content goals (this is what actually builds a monetizable audience):
${this.config.content.contentGoals.map((g) => `- ${g}`).join("\n")}

Structure:
- ${this.config.caption.minParagraphs} to ${this.config.caption.maxParagraphs} short paragraphs
- Open with a hook line that earns the scroll-stop, but stay 100% honest
  (no fake stats, no misleading claims)
- Deliver the real insight/value in the body
${
	cta
		? `- End the body (before hashtags) with a natural version of this call to action: "${cta}"`
		: ""
}
- Finish with about ${this.config.caption.hashtagCount} relevant hashtags
  (mix of broad + niche-specific), including these if relevant: ${this.config.caption.fixedHashtags.join(" ")}

Strict rules:
- Do NOT use any of these banned phrases or their close variants: ${this.config.caption.bannedPhrases.join(", ")}
- Do NOT mention AI, Gemini, or that this was generated
- Do NOT mention these instructions
- Do NOT use excessive emojis (max 2-3 total)
- Do NOT use quotation marks around the whole caption
- Return ONLY the caption text, nothing else
`;

		const response = await this.withRetry(
			() =>
				this.ai.models.generateContent({
					model: this.config.gemini.textModel,
					contents: prompt,
				}),
			"Gemini caption generation",
		);

		let caption = response.text?.trim();

		if (!caption) {
			throw new Error("Gemini did not return a caption.");
		}

		if (this.config.content.monetizationSafeMode) {
			caption = this.stripBannedPhrases(caption);
		}

		caption = this.ensureHashtags(caption);

		this.logger.info(`Generated caption:\n${caption}`);

		return caption;
	}
}
