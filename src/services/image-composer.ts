import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { templates } from "~/services";

import type { LoggerService } from "~/services";
import type { ImageComposeConfig } from "~/types";

/**
 * Service responsible for composing final images using AI-generated base images and templates.
 */
export class ImageComposeService {
	private _config: ImageComposeConfig;
	private _logger: LoggerService;

	/**
	 * Creates an instance of ImageComposeService.
	 * @param config Configuration for image composition.
	 * @param logger Logger service instance.
	 */
	public constructor(config: ImageComposeConfig, logger: LoggerService) {
		this._config = config;
		this._logger = logger;
	}

	/**
	 * Composes the final image by applying a template over the AI-generated base image.
	 * @param aiImageBuffer Buffer of the AI-generated image.
	 * @param headline The text headline to overlay.
	 * @param templateId Optional template ID to use.
	 * @returns The path of the composed final image.
	 */
	public async composeFinalImage(
		aiImageBuffer: Buffer,
		headline: string,
		templateId?: string,
	): Promise<string> {
		this._logger.info("[3/6] Compositing final image...");

		const { width, height } = this._config.image;

		const template =
			templates.find((t: { id: string }) => t.id === templateId) ||
			templates[Math.floor(Math.random() * templates.length)];

		this._logger.debug(`Using template: ${template?.id}`);

		const background = await sharp(aiImageBuffer)
			.resize(width, height, { fit: "cover", position: "center" })
			.toBuffer();

		const overlayBuffer = template?.svgBuilder(
			headline,
			width,
			height,
			this._config.facebook.pageName,
		);

		await fs.promises.mkdir(path.dirname(this._config.output.imagePath), {
			recursive: true,
		});

		await sharp(background)
			.composite([{ input: overlayBuffer, top: 0, left: 0 }])
			.png()
			.toFile(this._config.output.imagePath);

		this._logger.info(
			`Final image written to: ${this._config.output.imagePath}`,
		);
		return this._config.output.imagePath;
	}

	/**
	 * Returns the list of available template IDs.
	 */
	public getAvailableTemplateIds(): string[] {
		return templates.map((t: { id: string }) => t.id);
	}
}
