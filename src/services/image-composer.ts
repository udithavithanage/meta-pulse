import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { LoggerService } from "~/services/logger";
import type { Template, ImageComposeConfig } from "~/types";

// --- Helper Functions for SVG ---
function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length > maxCharsPerLine && current) {
			lines.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}
	if (current) lines.push(current);
	return lines;
}

// --- Templates ---
const templates: Template[] = [
	{
		id: "legacy-poll",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const lines = wrapText(safeText, 25);
			const fontSize = 55;
			const lineHeight = fontSize * 1.25;
			const blockHeight = lines.length * lineHeight;
			const pollY = height - 90;
			const textBottomY = pollY - 140;
			const firstLineY = textBottomY - blockHeight + fontSize;

			const tspans = lines
				.map(
					(line, i) =>
						`<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`,
				)
				.join("");

			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#040814" stop-opacity="0" />
            <stop offset="40%" stop-color="#040814" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#040814" stop-opacity="1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.85" />
        </filter>
    </defs>
    <rect x="0" y="${height * 0.3}" width="${width}" height="${height * 0.7}" fill="url(#fadeGradient)" />
    <!-- Watermark -->
    <text x="${width / 2}" y="60" text-anchor="middle" fill="rgba(255, 255, 255, 0.8)" font-family="Arial" font-size="30" font-weight="bold">${escapeXml(pageName)}</text>
    
    <text x="${width / 2}" y="${firstLineY}" text-anchor="middle" fill="#ffffff" font-family="Arial Black, Impact, sans-serif" font-size="${fontSize}" font-weight="900" filter="url(#shadow)">${tspans}</text>
    
    <rect x="${width * 0.1}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#002395" rx="2" />
    <rect x="${width * 0.366}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#ffffff" />
    <rect x="${width * 0.632}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#ed2939" rx="2" />

    <g transform="translate(0, ${pollY})">
        <circle cx="${width * 0.32}" cy="-14" r="30" fill="#ed2939" />
        <text x="${width * 0.32 + 45}" y="-2" text-anchor="start" fill="#ffffff" font-family="Arial Black, Impact, sans-serif" font-size="42" font-weight="900">HEART</text>
        <rect x="${width * 0.5 - 2}" y="-40" width="4" height="55" fill="#ffffff" fill-opacity="0.25" rx="2" />
        <circle cx="${width * 0.58}" cy="-14" r="30" fill="#002395" />
        <text x="${width * 0.58 + 45}" y="-2" text-anchor="start" fill="#ffffff" font-family="Arial Black, Impact, sans-serif" font-size="42" font-weight="900">LIKE</text>
    </g>
</svg>`);
		},
	},
	{
		id: "fire-vs-ice",
		svgBuilder: (headline, width, height, pageName) => {
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="50%" stop-opacity="0"/><stop offset="100%" stop-color="#333" stop-opacity="0.9"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g2)" />
    <!-- Watermark -->
    <text x="${width / 2}" y="60" text-anchor="middle" fill="rgba(255, 255, 255, 0.8)" font-family="Arial" font-size="30" font-weight="bold">${escapeXml(pageName)}</text>
    
    <text x="50%" y="50%" font-family="Impact" font-size="70" fill="yellow" text-anchor="middle">${escapeXml(headline)}</text>
    <text x="25%" y="90%" font-family="Arial" font-size="30" fill="orange">HOT</text>
    <text x="75%" y="90%" font-family="Arial" font-size="30" fill="cyan">COOL</text>
</svg>`);
		},
	},
	{
		id: "agree-disagree",
		svgBuilder: (headline, width, height, pageName) => {
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="rgba(0,0,50,0.5)" />
    <!-- Watermark -->
    <text x="${width / 2}" y="60" text-anchor="middle" fill="rgba(255, 255, 255, 0.8)" font-family="Arial" font-size="30" font-weight="bold">${escapeXml(pageName)}</text>
    
    <text x="50%" y="20%" font-family="Arial" font-size="40" fill="white" text-anchor="middle">${escapeXml(headline)}</text>
    <rect x="10%" y="80%" width="35%" height="10%" fill="green" rx="10"/>
    <text x="27.5%" y="87%" font-family="Arial" font-size="25" fill="white" text-anchor="middle">YES</text>
    <rect x="55%" y="80%" width="35%" height="10%" fill="red" rx="10"/>
    <text x="72.5%" y="87%" font-family="Arial" font-size="25" fill="white" text-anchor="middle">NO</text>
</svg>`);
		},
	},
];

export class ImageComposeService {
	private config: ImageComposeConfig;
	private logger: LoggerService;

	constructor(config: ImageComposeConfig, logger: LoggerService) {
		this.config = config;
		this.logger = logger;
	}

	async composeFinalImage(
		aiImageBuffer: Buffer,
		headline: string,
		templateId?: string,
	): Promise<string> {
		this.logger.info("[3/6] Compositing final image...");

		const { width, height } = this.config.image;

		const template =
			templates.find((t) => t.id === templateId) ||
			templates[Math.floor(Math.random() * templates.length)];

		this.logger.debug(`Using template: ${template?.id}`);

		const background = await sharp(aiImageBuffer)
			.resize(width, height, { fit: "cover", position: "center" })
			.toBuffer();

		const overlayBuffer = template?.svgBuilder(
			headline,
			width,
			height,
			this.config.facebook.pageName,
		);

		await fs.promises.mkdir(path.dirname(this.config.output.imagePath), {
			recursive: true,
		});

		await sharp(background)
			.composite([{ input: overlayBuffer, top: 0, left: 0 }])
			.png()
			.toFile(this.config.output.imagePath);

		this.logger.info(`Final image written to: ${this.config.output.imagePath}`);
		return this.config.output.imagePath;
	}
}
