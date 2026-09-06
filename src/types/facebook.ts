export interface FacebookConfig {
	pageId: string;
	pageName: string;
	accessToken: string;
	graphVersion: string;
}

export interface ReliabilityConfig {
	requestTimeoutMs: number;
}

export interface FacebookPostResponse {
	id: string;
	post_id?: string;
}
