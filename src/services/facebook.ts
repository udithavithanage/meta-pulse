import fs from "node:fs";

import axios from "axios";
import FormData from "form-data";

import type { LoggerService } from "~/services";
import type {
	FacebookConfig,
	FacebookPostResponse,
	ReliabilityConfig,
} from "~/types";

export class FacebookService {
	private config: FacebookConfig;
	private reliability: ReliabilityConfig;
	private logger: LoggerService;
	private withRetry: <T>(
		fn: () => Promise<T>,
		description: string,
	) => Promise<T>;

	constructor(
		config: FacebookConfig,
		reliability: ReliabilityConfig,
		logger: LoggerService,
		withRetry: <T>(fn: () => Promise<T>, description: string) => Promise<T>,
	) {
		this.config = config;
		this.reliability = reliability;
		this.logger = logger;
		this.withRetry = withRetry;
	}

	async postToFacebook(
		imagePath: string,
		caption: string,
	): Promise<FacebookPostResponse> {
		this.logger.info(
			"[5/6] Uploading to Facebook via Feed Post method (Page Token)...",
		);

		const { pageId, accessToken, graphVersion } = this.config;

		if (!pageId || !accessToken) {
			throw new Error(
				"FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN is missing from config",
			);
		}

		const doUpload = async () => {
			// Step 1: Upload photo as unpublished to get Media ID
			this.logger.info(
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
				timeout: this.reliability.requestTimeoutMs,
			});

			const mediaId = photoResponse.data.id;
			this.logger.info(`Image uploaded successfully. Media ID: ${mediaId}`);

			// Step 2: Publish standard feed post with the image
			this.logger.info(
				"-> Step 2: Publishing standard feed post with the image...",
			);
			const feedUrl = `https://graph.facebook.com/${graphVersion}/${pageId}/feed`;

			const feedData = {
				message: caption,
				attached_media: [{ media_fbid: mediaId }],
				access_token: accessToken,
			};

			const feedResponse = await axios.post(feedUrl, feedData, {
				timeout: this.reliability.requestTimeoutMs,
			});

			return feedResponse.data;
		};

		const result = await this.withRetry(doUpload, "Facebook upload");

		this.logger.info("[6/6] Facebook post successful!");
		this.logger.info(`Post response ID: ${result.id}`);

		return result;
	}
}
