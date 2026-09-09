import {
	ConfigService,
	FacebookService,
	FileService,
	GeminiService,
	HistoryService,
	ImageComposeService,
	LoggerService,
	PollinationsService,
} from "~/services";

/**
 * Executes a function with a simple retry mechanism.
 * @param fn The function to execute.
 * @param description A description of the action, used for error logging.
 * @returns A promise resolving to the function's return value.
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	description: string,
): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		console.error(`Retry failed for: ${description}`, err);
		throw err;
	}
}

export async function main() {
	const configService = new ConfigService();
	const config = configService.load();

	const logger = new LoggerService(
		config.history.filePath.replace("history.json", "app.log"),
	);
	const fileService = new FileService(logger);
	const historyService = new HistoryService(
		{ history: config.history },
		fileService,
		logger,
	);

	const geminiService = new GeminiService(
		{
			gemini: config.gemini,
			content: config.content,
			image: { headline: config.image.headline },
			caption: config.caption,
		},
		logger,
		historyService,
		withRetry,
	);

	const pollinationsService = new PollinationsService(
		{
			image: {
				promptTemplate: config.image.promptTemplate,
				width: config.image.width,
				height: config.image.height,
			},
		},
		logger,
	);
	const imageComposeService = new ImageComposeService(
		{
			image: { width: config.image.width, height: config.image.height },
			facebook: { pageName: config.facebook.pageName },
			output: config.output,
		},
		logger,
	);
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
		const imageBuffer = await pollinationsService.generateImage(plan);
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

// Execute if run directly
if (import.meta.main) {
	main();
}
