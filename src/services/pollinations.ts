import type { LoggerService } from "~/services/logger";
import type { PollinationsConfig, TopicPlan } from "~/types";

export class PollinationsService {
	private config: PollinationsConfig;
	private logger: LoggerService;

	constructor(config: PollinationsConfig, logger: LoggerService) {
		this.config = config;
		this.logger = logger;
	}

	private buildPrompt(plan: TopicPlan): string {
		return this.config.image.promptTemplate
			.replace("{{TOPIC}}", plan.topic)
			.replace("{{VISUAL_HINT}}", plan.visualHint || plan.topic);
	}

	/**
	 * Generates the base AI photo/illustration using Pollinations.ai API.
	 * Returns a JPEG buffer.
	 */
	async generateImage(plan: TopicPlan): Promise<Buffer> {
		this.logger.info("[2/6] Generating AI image with Pollinations.ai...");

		const prompt = this.buildPrompt(plan);
		const encodedPrompt = encodeURIComponent(prompt);
		const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${this.config.image.width}&height=${this.config.image.height}&nologo=true`;

		try {
			const response = await fetch(imageUrl);

			if (!response.ok) {
				throw new Error(
					`Pollinations API failed with status: ${response.status}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			this.logger.info("AI image successfully received from Pollinations.ai");
			return buffer;
		} catch (error) {
			throw new Error(
				`Pollinations image generation failed: ${(error as Error).message}`,
			);
		}
	}
}
