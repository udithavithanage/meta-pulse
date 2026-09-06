import { FacebookService } from "~/services/facebook";
import { FileService } from "~/services/filets";
import { GeminiService } from "~/services/gemini";
import { HistoryService } from "~/services/history";
import { ImageComposeService } from "~/services/image-compose";
import { LoggerService } from "~/services/logger";
import { PollinationsService } from "~/services/pollinations";

// Configuration (Normally loaded from env, here mocked for structure)
const config = {
	gemini: {
		apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key",
		textModel: process.env.GEMINI_TEXT_MODEL || "gemini-1.5-flash",
		useGoogleSearchGrounding:
			process.env.GEMINI_USE_GOOGLE_SEARCH_GROUNDING === "true",
		topicPrompt: process.env.GEMINI_TOPIC_PROMPT || "your-gemini-topic-prompt",
	},
	content: {
		niche: process.env.CONTENT_NICHE || "your-content-niche",
		bannedTopics: (process.env.CONTENT_BANNED_TOPICS || "").split(", "),
		monetizationSafeMode: process.env.CONTENT_MONETIZATION_SAFE_MODE === "true",
		tone: "Informative, engaging, and professional",
		language: "English",
		contentGoals: ["Build authority", "Provide value"],
	},
	image: {
		headline: {
			maxCharacters: Number(process.env.IMAGE_HEADLINE_MAX_CHARACTERS || 60),
		},
		width: 1024,
		height: 1024,
		promptTemplate:
			"A high-quality, professional photo illustrating: {{TOPIC}}. {{VISUAL_HINT}}",
	},
	output: {
		imagePath: "./final_post.png",
	},
	caption: {
		callToActionOptions: ["What do you think?", "Let me know in the comments!"],
		bannedPhrases: ["click here", "buy now"],
		includeCallToAction: true,
		minParagraphs: 2,
		maxParagraphs: 4,
		hashtagCount: 3,
		fixedHashtags: ["#AI", "#TechTrends"],
	},
	facebook: {
		pageId: process.env.FACEBOOK_PAGE_ID || "your-facebook-page-id",
		pageName: process.env.FACEBOOK_PAGE_NAME || "Your Brand",
		accessToken:
			process.env.FACEBOOK_ACCESS_TOKEN || "your-facebook-access-token",
		graphVersion: process.env.GRAPH_API_VERSION || "v23.0",
	},
	reliability: { requestTimeoutMs: 30000 },
	history: {
		filePath: process.env.HISTORY_FILE_PATH || "./logs/history.json",
		keepLastN: Number(process.env.HISTORY_KEEP_LAST_N || 50),
	},
};

async function withRetry<T>(
	fn: () => Promise<T>,
	description: string,
): Promise<T> {
	// Simple retry implementation
	try {
		return await fn();
	} catch (err) {
		console.error(`Retry failed for: ${description}`, err);
		throw err;
	}
}

async function main() {
	const logger = new LoggerService(
		process.env.LOGGING_FILE_PATH || "./logs/app.log",
	);
	const fileService = new FileService(logger);
	const historyService = new HistoryService(config, fileService, logger);

	const geminiService = new GeminiService(
		config as any, // Type assertion for simplicity
		logger,
		historyService,
		withRetry,
	);
	const pollinationsService = new PollinationsService(config as any, logger);
	const imageComposeService = new ImageComposeService(config, logger);
	const facebookService = new FacebookService(
		config.facebook,
		config.reliability,
		logger,
		withRetry,
	);

	try {
		logger.info("Starting automated content workflow...");

		// 1. Research Topic
		const plan = await geminiService.generateTopic();

		// 2. Generate Caption
		const caption = await geminiService.generateCaption(plan);

		// 3. Generate Image
		const imageBuffer = await pollinationsService.generateImage({
			topic: plan.topic,
			visualHint: plan.visualHint,
		});

		// Compose final image with template
		const finalImagePath = await imageComposeService.composeFinalImage(
			imageBuffer,
			plan.headline,
		);

		// 4. Post to Facebook
		await facebookService.postToFacebook(finalImagePath, caption);

		// 5. Update History
		historyService.addEntry(plan);

		logger.info("Workflow completed successfully!");
	} catch (err) {
		logger.error(`Workflow failed: ${(err as Error).message}`);
	}
}

main();
