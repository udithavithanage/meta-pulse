import fs from "node:fs";

import axios from "axios";
import FormData from "form-data";

import type { LoggerService } from "~/services";
import type {
	FacebookConfig,
	FacebookPostResponse,
	ReliabilityConfig,
} from "~/types";

/**
 * Service responsible for interacting with the Facebook Graph API to post content.
 */
export class FacebookService {
	private _config: FacebookConfig;
	private _reliability: ReliabilityConfig;
	private _logger: LoggerService;
	private _withRetry: <T>(
		fn: () => Promise<T>,
		description: string,
	) => Promise<T>;

	/**
	 * Creates an instance of FacebookService.
	 * @param config Facebook API configuration.
	 * @param reliability Reliability configuration for requests.
	 * @param logger Logger service instance.
	 * @param withRetry Retry handler function.
	 */
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
	 * Posts a photo with a caption to the Facebook Page feed.
	 * @param imagePath The path of the image to post.
	 * @param caption The caption text for the post.
	 * @returns The response from the Facebook API.
	 */
	public async postToFacebook(
		imagePath: string,
		caption: string,
	): Promise<FacebookPostResponse> {
		this._logger.info(
			"[5/6] Uploading to Facebook via Feed Post method (Page Token)...",
		);

		const { pageId, accessToken, graphVersion } = this._config;

		if (!pageId || !accessToken) {
			throw new Error(
				"FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN is missing from config",
			);
		}

		const doUpload = async () => {
			this._logger.info(
				"-> Step 1: Uploading image as unpublished to get Media ID...",
			);
			const photoUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/photos`;

			const photoForm = new FormData();
			photoForm.append("source", fs.createReadStream(imagePath), {
				filename: "facebook-post.png",
				contentType: "image/png",
			});
			photoForm.append("published", "false");
			photoForm.append("access_token", accessToken);

			const photoResponse = await axios.post(photoUrl, photoForm, {
				headers: { ...photoForm.getHeaders() },
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
				timeout: this._reliability.requestTimeoutMs,
			});

			const mediaId = photoResponse.data.id;
			this._logger.info(`Image uploaded successfully. Media ID: ${mediaId}`);

			this._logger.info(
				"-> Step 2: Publishing standard feed post with the image...",
			);
			const feedUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;

			const feedData = {
				message: caption,
				attached_media: [{ media_fbid: mediaId }],
				access_token: accessToken,
			};

			const feedResponse = await axios.post(feedUrl, feedData, {
				timeout: this._reliability.requestTimeoutMs,
			});

			return feedResponse.data;
		};

		const result = await this._withRetry(doUpload, "Facebook upload");

		this._logger.info("[6/6] Facebook post successful!");
		this._logger.info(`Post response ID: ${result.id}`);

		return result;
	}
}
