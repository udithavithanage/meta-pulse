import fs from "node:fs";
import http from "node:http";
import https from "node:https";

import axios from "axios";
import FormData from "form-data";

import type { AxiosError } from "axios";
import type { LoggerService } from "~/services";
import type {
	FacebookConfig,
	FacebookPostResponse,
	ReliabilityConfig,
	FacebookGraphError,
} from "~/types";

// Persistent HTTP agents optimize latency for sequential Graph API operations
// by maintaining established TCP/TLS connections.
const keepAliveHttpAgent = new http.Agent({ keepAlive: true });
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true });

const graphClient = axios.create({
	httpAgent: keepAliveHttpAgent,
	httpsAgent: keepAliveHttpsAgent,
});

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Service to interact with the Facebook Graph API.
 */
export class FacebookService {
	private _config: FacebookConfig;
	private _reliability: ReliabilityConfig;
	private _logger: LoggerService;
	private _withRetry: <T>(
		fn: () => Promise<T>,
		description: string,
	) => Promise<T>;

	private _imageBufferCache: { path: string; buffer: Buffer } | null = null;

	public constructor(
		config: FacebookConfig,
		reliability: ReliabilityConfig,
		logger: LoggerService,
		withRetry: <T>(fn: () => Promise<T>, description: string) => Promise<T>,
	) {
		this._config = config;
		this._reliability = reliability;
		this._logger = logger;
		this._withRetry = withRetry;
	}

	/**
	 * Translates Axios errors into human-readable Graph API error messages.
	 */
	private _describeGraphError(err: unknown): string {
		if (axios.isAxiosError(err)) {
			const axiosErr = err as AxiosError<{ error?: FacebookGraphError }>;
			const fbError = axiosErr.response?.data?.error;

			if (fbError) {
				const parts = [
					`(${fbError.code}${fbError.error_subcode ? `/${fbError.error_subcode}` : ""})`,
					fbError.error_user_msg ?? fbError.message,
				];
				return parts.join(" ");
			}

			return `HTTP ${axiosErr.response?.status ?? "?"} - ${axiosErr.message}`;
		}

		return err instanceof Error ? err.message : String(err);
	}

	/**
	 * Caches image buffer to minimize disk I/O during multi-step posting workflows.
	 */
	private _getImageBuffer(imagePath: string): Buffer {
		if (this._imageBufferCache?.path === imagePath) {
			return this._imageBufferCache.buffer;
		}

		const buffer = fs.readFileSync(imagePath);
		this._imageBufferCache = { path: imagePath, buffer };
		return buffer;
	}

	/**
	 * Uploads an image as an unpublished photo to the Page.
	 * Note: Facebook requires independent uploads for Feed posts and Stories.
	 */
	private async _uploadUnpublishedPhoto(
		imageBuffer: Buffer,
		pageId: string,
		accessToken: string,
		graphVersion: string,
		timeoutMs: number,
	): Promise<string> {
		const photoUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`;

		const form = new FormData();
		form.append("source", imageBuffer, {
			filename: "facebook-post.png",
			contentType: "image/png",
		});
		form.append("published", "false");
		form.append("access_token", accessToken);

		const response = await graphClient.post(photoUrl, form, {
			headers: { ...form.getHeaders() },
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
			timeout: timeoutMs,
		});

		return response.data.id;
	}

	/**
	 * Publishes a Page Story.
	 * Utilizes a dedicated retry strategy to handle the high latency variance
	 * characteristic of Story uploads.
	 */
	private async _publishStory(
		imageBuffer: Buffer,
		pageId: string,
		accessToken: string,
		graphVersion: string,
	): Promise<void> {
		const maxAttempts = 3;
		const baseDelayMs = 1_500;
		const storyTimeoutMs = Math.max(this._reliability.requestTimeoutMs, 45_000);

		let lastError: unknown;

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			try {
				this._logger.info(
					`-> Step 3: Uploading a dedicated image for the story (attempt ${attempt}/${maxAttempts})...`,
				);
				const storyMediaId = await this._uploadUnpublishedPhoto(
					imageBuffer,
					pageId,
					accessToken,
					graphVersion,
					storyTimeoutMs,
				);
				this._logger.info(`Story image uploaded. Media ID: ${storyMediaId}`);

				this._logger.info("-> Step 4: Publishing to story...");
				const storyUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/photo_stories`;

				await graphClient.post(
					storyUrl,
					{ photo_id: storyMediaId, access_token: accessToken },
					{ timeout: storyTimeoutMs },
				);

				this._logger.info("Story published successfully.");
				return;
			} catch (err) {
				lastError = err;
				const isLastAttempt = attempt === maxAttempts;
				this._logger.info(
					`Story attempt ${attempt}/${maxAttempts} failed: ${this._describeGraphError(err)}${
						isLastAttempt ? "" : " - retrying..."
					}`,
				);

				if (!isLastAttempt) {
					await sleep(baseDelayMs * attempt);
				}
			}
		}

		throw lastError;
	}

	/**
	 * Orchestrates the posting workflow: uploads content and publishes to Feed and optionally Story.
	 */
	public async postToFacebook(
		imagePath: string,
		caption: string,
	): Promise<FacebookPostResponse> {
		this._logger.info(
			"[5/6] Uploading to Facebook via Feed Post method (Page Token)...",
		);

		const { pageId, accessToken, graphVersion, postToStory } = this._config;

		if (!pageId || !accessToken) {
			throw new Error(
				"FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN is missing from config",
			);
		}

		const imageBuffer = this._getImageBuffer(imagePath);

		const doUpload = async () => {
			this._logger.info(
				"-> Step 1: Uploading image as unpublished to get Media ID for feed...",
			);
			const feedMediaId = await this._uploadUnpublishedPhoto(
				imageBuffer,
				pageId,
				accessToken,
				graphVersion,
				this._reliability.requestTimeoutMs,
			);
			this._logger.info(`Feed image uploaded. Media ID: ${feedMediaId}`);

			this._logger.info(
				"-> Step 2: Publishing standard feed post with the image...",
			);
			const feedUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;

			const feedResponse = await graphClient.post(
				feedUrl,
				{
					message: caption,
					attached_media: [{ media_fbid: feedMediaId }],
					access_token: accessToken,
				},
				{ timeout: this._reliability.requestTimeoutMs },
			);

			return feedResponse.data as FacebookPostResponse;
		};

		const result = await this._withRetry(doUpload, "Facebook feed upload");

		this._logger.info("[6/6] Facebook post successful!");
		this._logger.info(`Post response ID: ${result.id}`);

		// Story publishing is a best-effort operation.
		if (postToStory) {
			await sleep(1_000);

			try {
				await this._publishStory(
					imageBuffer,
					pageId,
					accessToken,
					graphVersion,
				);
			} catch (err) {
				this._logger.info(
					`Story publish failed after retries, continuing without it: ${this._describeGraphError(err)}`,
				);
			}
		}

		this._imageBufferCache = null;

		return result;
	}
}
