export interface Template {
	id: string;
	svgBuilder: (
		headline: string,
		width: number,
		height: number,
		pageName: string,
	) => Buffer;
}

export interface ImageComposeConfig {
	image: {
		width: number;
		height: number;
	};
	facebook: {
		pageName: string;
	};
	output: {
		imagePath: string;
	};
}

export interface PollinationsConfig {
	image: {
		promptTemplate: string;
		width: number;
		height: number;
	};
}
