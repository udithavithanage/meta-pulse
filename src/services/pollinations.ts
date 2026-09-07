import type { LoggerService } from "~/services";
import type { PollinationsConfig, TopicPlan } from "~/types";

/**
 * Service responsible for interacting with the Pollinations.ai API to generate images.
 */
export class PollinationsService {
	private _config: PollinationsConfig;
	private _logger: LoggerService;

	/**
	 * Creates an instance of PollinationsService.
	 * @param config Pollinations API configuration.
	 * @param logger Logger service instance.
	 */
	public constructor(config: PollinationsConfig, logger: LoggerService) {
		this._config = config;
		this._logger = logger;
	}

	/**
	 * Builds the image prompt based on the topic plan.
	 * @param plan The topic plan.
	 * @returns The formatted prompt string.
	 */
	private _buildPrompt(plan: TopicPlan): string {
		return this._config.image.promptTemplate
			.replace("{{TOPIC}}", plan.topic)
			.replace("{{VISUAL_HINT}}", plan.visualHint || plan.topic);
	}

	/**
	 * Generates the base AI photo/illustration using Pollinations.ai API.
	 * @param plan The topic plan.
	 * @returns A Promise resolving to the image buffer (JPEG).
	 */
	public async generateImage(plan: TopicPlan): Promise<Buffer> {
		this._logger.info("[2/6] Generating AI image with Pollinations.ai...");

		const prompt = this._buildPrompt(plan);
		const encodedPrompt = encodeURIComponent(prompt);
		const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${this._config.image.width}&height=${this._config.image.height}&nologo=true`;

		try {
			const response = await fetch(imageUrl);

			if (!response.ok) {
				throw new Error(
					`Pollinations API failed with status: ${response.status}`,
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			this._logger.info("AI image successfully received from Pollinations.ai");
			return buffer;
		} catch (error) {
			throw new Error(
				`Pollinations image generation failed: ${(error as Error).message}`,
			);
		}
	}
}
