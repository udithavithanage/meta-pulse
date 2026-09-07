export interface FacebookConfig {
	pageId: string;
	pageName: string;
	accessToken: string;
	graphVersion: string;
	postToStory: boolean;
}

export interface ReliabilityConfig {
	requestTimeoutMs: number;
}

export interface FacebookPostResponse {
	id: string;
	post_id?: string;
}

export interface FacebookGraphError {
	message: string;
	type: string;
	code: number;
	error_subcode?: number;
	error_user_title?: string;
	error_user_msg?: string;
	fbtrace_id?: string;
}
