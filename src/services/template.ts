import { escapeXml, wrapText } from "~/utils";

import type { Template } from "~/types";

const HEART_PATH =
	"M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

const THUMB_PATH =
	"M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z";

/**
 * Renders a circular badge with a white icon centered inside it, plus a label to the side.
 * cx/cy = badge center, r = badge radius, iconType = "heart" | "thumb"
 */
function iconBadge(
	cx: number,
	cy: number,
	r: number,
	fill: string,
	iconType: "heart" | "thumb",
	label: string,
	labelColor: string,
	labelFontSize: number,
	labelSide: "right" | "left" = "right",
	strokeColor?: string,
): string {
	const iconPath = iconType === "heart" ? HEART_PATH : THUMB_PATH;
	const iconScale = (r * 1.15) / 24; // icon fits nicely inside the circle
	const iconOffset = -12 * iconScale; // center the 24x24 viewBox on (cx, cy)

	const labelX = labelSide === "right" ? cx + r + 16 : cx - r - 16;
	const anchor = labelSide === "right" ? "start" : "end";

	return `
    <g>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${strokeColor ? `stroke="${strokeColor}" stroke-width="3"` : ""} />
        <g transform="translate(${cx + iconOffset}, ${cy + iconOffset}) scale(${iconScale})">
            <path d="${iconPath}" fill="#ffffff" />
        </g>
        <text x="${labelX}" y="${cy + labelFontSize * 0.35}" text-anchor="${anchor}" fill="${labelColor}" font-family="Arial Black, Impact, sans-serif" font-size="${labelFontSize}" font-weight="900">${label}</text>
    </g>`;
}

/**
 * Rough estimate of rendered text width for bold/black uppercase-style labels
 * (Arial Black / Impact). Not pixel-perfect, but close enough to keep the
 * reaction row visually centered regardless of label length or canvas width.
 */
function measureLabelWidth(label: string, fontSize: number): number {
	return label.length * fontSize * 0.62;
}

type BadgeSpec = { r: number; label: string; fontSize: number };

/**
 * Computes horizontal centers for a "heart | like" style badge pair so the
 * WHOLE row (both circles + both labels) is centered on the canvas, no
 * matter how wide the canvas is or how long each label is. Also returns a
 * midpoint x for an optional divider between the two badges.
 */
function computeCenteredPair(
	width: number,
	badge1: BadgeSpec,
	badge2: BadgeSpec,
	gap: number,
): { cx1: number; cx2: number; dividerX: number } {
	const w1 =
		badge1.r * 2 + 16 + measureLabelWidth(badge1.label, badge1.fontSize);
	const w2 =
		badge2.r * 2 + 16 + measureLabelWidth(badge2.label, badge2.fontSize);
	const total = w1 + gap + w2;
	const startX = width / 2 - total / 2;
	const cx1 = startX + badge1.r;
	const cx2 = startX + w1 + gap + badge2.r;
	const dividerX = startX + w1 + gap / 2;
	return { cx1, cx2, dividerX };
}

/**
 * Wraps headline text and returns the positioned <text> block, bottom-anchored at textBottomY.
 */
function headlineBlock(
	safeText: string,
	width: number,
	fontSize: number,
	textBottomY: number,
	fontFamily: string,
	fill: string,
	filterAttr: string,
	wrapChars: number,
): string {
	const lines = wrapText(safeText, wrapChars);
	const lineHeight = fontSize * 1.25;
	const blockHeight = lines.length * lineHeight;
	const firstLineY = textBottomY - blockHeight + fontSize;
	const tspans = lines
		.map(
			(line, i) =>
				`<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`,
		)
		.join("");
	return `<text x="${width / 2}" y="${firstLineY}" text-anchor="middle" fill="${fill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="900" ${filterAttr}>${tspans}</text>`;
}

/**
 * Defines available SVG templates for image composition.
 */
export const templates: Template[] = [
	// 1) Classic tricolor poll
	{
		id: "legacy-poll",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 90;
			const textBottomY = pollY - 140;
			const pos = computeCenteredPair(
				width,
				{ r: 30, label: "HEART", fontSize: 42 },
				{ r: 30, label: "LIKE", fontSize: 42 },
				56,
			);

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
    ${headlineBlock(safeText, width, 55, textBottomY, "Arial Black, Impact, sans-serif", "#ffffff", 'filter="url(#shadow)"', 25)}
    <rect x="${width * 0.1}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#002395" rx="2" />
    <rect x="${width * 0.366}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#ffffff" />
    <rect x="${width * 0.632}" y="${pollY - 95}" width="${width * 0.266}" height="6" fill="#ed2939" rx="2" />
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 30, "#ed2939", "heart", "HEART", "#ffffff", 42, "right")}
        <rect x="${pos.dividerX - 2}" y="-40" width="4" height="55" fill="#ffffff" fill-opacity="0.25" rx="2" />
        ${iconBadge(pos.cx2, -14, 30, "#002395", "thumb", "LIKE", "#ffffff", 42, "right")}
    </g>
</svg>`);
		},
	},

	// 2) Neon Cyberpunk
	{
		id: "neon-cyber",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 100;
			const textBottomY = pollY - 150;
			const pos = computeCenteredPair(
				width,
				{ r: 32, label: "HEART", fontSize: 40 },
				{ r: 32, label: "LIKE", fontSize: 40 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0d0221" stop-opacity="0" />
            <stop offset="45%" stop-color="#0d0221" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#0d0221" stop-opacity="1" />
        </linearGradient>
        <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
    </defs>
    <rect x="0" y="${height * 0.28}" width="${width}" height="${height * 0.72}" fill="url(#fade2)" />
    <rect x="0" y="30" width="${width}" height="4" fill="#ff2fd6" />
    <text x="${width / 2}" y="65" text-anchor="middle" fill="#ff2fd6" font-family="Arial" font-size="30" font-weight="bold" filter="url(#neonGlow)">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 56, textBottomY, "Arial Black, Impact, sans-serif", "#ffffff", 'filter="url(#neonGlow)"', 24)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 32, "#00f0ff", "heart", "HEART", "#00f0ff", 40, "right")}
        <rect x="${pos.dividerX - 1.5}" y="-42" width="3" height="58" fill="#ff2fd6" opacity="0.6" />
        ${iconBadge(pos.cx2, -14, 32, "#ff2fd6", "thumb", "LIKE", "#ff2fd6", 40, "right")}
    </g>
</svg>`);
		},
	},

	// 3) Minimalist Dark / Corporate
	{
		id: "minimal-dark",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 85;
			const textBottomY = pollY - 130;
			const pos = computeCenteredPair(
				width,
				{ r: 26, label: "REACT", fontSize: 30 },
				{ r: 26, label: "REACT", fontSize: 30 },
				40,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade3" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#111318" stop-opacity="0" />
            <stop offset="50%" stop-color="#111318" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#111318" stop-opacity="1" />
        </linearGradient>
    </defs>
    <rect x="0" y="${height * 0.35}" width="${width}" height="${height * 0.65}" fill="url(#fade3)" />
    <text x="${width / 2}" y="55" text-anchor="middle" fill="#e5e5e5" font-family="Arial" font-size="26" font-weight="600" letter-spacing="2">${escapeXml(pageName).toUpperCase()}</text>
    ${headlineBlock(safeText, width, 50, textBottomY, "Arial, Helvetica, sans-serif", "#ffffff", "", 28)}
    <rect x="${width * 0.15}" y="${pollY - 80}" width="${width * 0.7}" height="2" fill="#4a4a4a" />
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -10, 26, "#e63946", "heart", "REACT", "#e5e5e5", 30, "right")}
        ${iconBadge(pos.cx2, -10, 26, "#457b9d", "thumb", "REACT", "#e5e5e5", 30, "right")}
    </g>
</svg>`);
		},
	},

	// 4) Gold Luxury
	{
		id: "gold-luxury",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 95;
			const textBottomY = pollY - 145;
			const pos = computeCenteredPair(
				width,
				{ r: 30, label: "HEART", fontSize: 36 },
				{ r: 30, label: "LIKE", fontSize: 36 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#bf953f" />
            <stop offset="50%" stop-color="#fcf6ba" />
            <stop offset="100%" stop-color="#b38728" />
        </linearGradient>
        <linearGradient id="fade4" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#000000" stop-opacity="0" />
            <stop offset="45%" stop-color="#000000" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#000000" stop-opacity="1" />
        </linearGradient>
        <filter id="goldShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.6" />
        </filter>
    </defs>
    <rect x="0" y="${height * 0.3}" width="${width}" height="${height * 0.7}" fill="url(#fade4)" />
    <text x="${width / 2}" y="60" text-anchor="middle" fill="url(#goldGrad)" font-family="Georgia, serif" font-size="28" font-weight="bold" letter-spacing="3">${escapeXml(pageName).toUpperCase()}</text>
    ${headlineBlock(safeText, width, 54, textBottomY, "Georgia, 'Times New Roman', serif", "url(#goldGrad)", 'filter="url(#goldShadow)"', 26)}
    <rect x="${width * 0.2}" y="${pollY - 90}" width="${width * 0.6}" height="3" fill="url(#goldGrad)" />
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 30, "#1a1a1a", "heart", "HEART", "#fcf6ba", 36, "right", "#bf953f")}
        ${iconBadge(pos.cx2, -14, 30, "#1a1a1a", "thumb", "LIKE", "#fcf6ba", 36, "right", "#bf953f")}
    </g>
</svg>`);
		},
	},

	// 5) Pastel / Cute
	{
		id: "pastel-cute",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 90;
			const textBottomY = pollY - 135;
			const pos = computeCenteredPair(
				width,
				{ r: 30, label: "HEART", fontSize: 38 },
				{ r: 30, label: "LIKE", fontSize: 38 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade5" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#3a2b3d" stop-opacity="0" />
            <stop offset="45%" stop-color="#3a2b3d" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#3a2b3d" stop-opacity="0.95" />
        </linearGradient>
    </defs>
    <rect x="0" y="${height * 0.32}" width="${width}" height="${height * 0.68}" fill="url(#fade5)" />
    <rect x="${width / 2 - 90}" y="30" width="180" height="42" rx="21" fill="#ffd6e8" />
    <text x="${width / 2}" y="58" text-anchor="middle" fill="#7a3b57" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="24" font-weight="bold">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 52, textBottomY, "Arial Rounded MT Bold, Arial, sans-serif", "#fff6fa", "", 26)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 30, "#ff8fab", "heart", "HEART", "#fff6fa", 38, "right")}
        <circle cx="${pos.dividerX}" cy="-14" r="4" fill="#ffd6e8" />
        ${iconBadge(pos.cx2, -14, 30, "#8ecae6", "thumb", "LIKE", "#fff6fa", 38, "right")}
    </g>
</svg>`);
		},
	},

	// 6) Sports / Stadium
	{
		id: "sports-stadium",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 95;
			const textBottomY = pollY - 145;
			const pos = computeCenteredPair(
				width,
				{ r: 32, label: "HEART", fontSize: 42 },
				{ r: 32, label: "LIKE", fontSize: 42 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade6" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#062e1f" stop-opacity="0" />
            <stop offset="45%" stop-color="#062e1f" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#062e1f" stop-opacity="1" />
        </linearGradient>
        <filter id="sportShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity="0.9" />
        </filter>
    </defs>
    <rect x="0" y="${height * 0.3}" width="${width}" height="${height * 0.7}" fill="url(#fade6)" />
    <text x="${width / 2}" y="58" text-anchor="middle" fill="#ffd60a" font-family="Arial Black, Impact, sans-serif" font-size="30" font-weight="900">${escapeXml(pageName).toUpperCase()}</text>
    ${headlineBlock(safeText, width, 56, textBottomY, "Arial Black, Impact, sans-serif", "#ffffff", 'filter="url(#sportShadow)"', 22)}
    <rect x="${width * 0.1}" y="${pollY - 92}" width="${width * 0.8}" height="8" fill="#ffd60a" />
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 32, "#d62828", "heart", "HEART", "#ffffff", 42, "right")}
        ${iconBadge(pos.cx2, -14, 32, "#1d3557", "thumb", "LIKE", "#ffffff", 42, "right")}
    </g>
</svg>`);
		},
	},

	// 7) Corporate Blue
	{
		id: "corporate-blue",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 85;
			const textBottomY = pollY - 130;
			const pos = computeCenteredPair(
				width,
				{ r: 27, label: "AGREE", fontSize: 28 },
				{ r: 27, label: "SUPPORT", fontSize: 28 },
				40,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade7" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0a1f44" stop-opacity="0" />
            <stop offset="50%" stop-color="#0a1f44" stop-opacity="0.88" />
            <stop offset="100%" stop-color="#0a1f44" stop-opacity="1" />
        </linearGradient>
    </defs>
    <rect x="0" y="${height * 0.34}" width="${width}" height="${height * 0.66}" fill="url(#fade7)" />
    <rect x="0" y="0" width="${width}" height="70" fill="#0a1f44" />
    <text x="${width / 2}" y="45" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 48, textBottomY, "Arial, Helvetica, sans-serif", "#ffffff", "", 30)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -12, 27, "#2a6f97", "heart", "AGREE", "#ffffff", 28, "right")}
        ${iconBadge(pos.cx2, -12, 27, "#61a5c2", "thumb", "SUPPORT", "#ffffff", 28, "right")}
    </g>
</svg>`);
		},
	},

	// 8) Sunset Gradient
	{
		id: "sunset-gradient",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 95;
			const textBottomY = pollY - 145;
			const pos = computeCenteredPair(
				width,
				{ r: 30, label: "HEART", fontSize: 40 },
				{ r: 30, label: "LIKE", fontSize: 40 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="sunsetBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff7e5f" stop-opacity="0" />
            <stop offset="45%" stop-color="#ff5f6d" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#3d0e1f" stop-opacity="0.95" />
        </linearGradient>
        <filter id="sunsetShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity="0.7" />
        </filter>
    </defs>
    <rect x="0" y="${height * 0.28}" width="${width}" height="${height * 0.72}" fill="url(#sunsetBg)" />
    <text x="${width / 2}" y="58" text-anchor="middle" fill="#ffe8d6" font-family="Arial" font-size="28" font-weight="bold">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 54, textBottomY, "Arial Black, Impact, sans-serif", "#fff4e6", 'filter="url(#sunsetShadow)"', 24)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 30, "#ff5f6d", "heart", "HEART", "#fff4e6", 40, "right")}
        ${iconBadge(pos.cx2, -14, 30, "#ffc371", "thumb", "LIKE", "#3d0e1f", 40, "right")}
    </g>
</svg>`);
		},
	},

	// 9) Holiday / Festive
	{
		id: "holiday-festive",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 95;
			const textBottomY = pollY - 145;
			const pos = computeCenteredPair(
				width,
				{ r: 30, label: "HEART", fontSize: 40 },
				{ r: 30, label: "LIKE", fontSize: 40 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade9" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0b3d20" stop-opacity="0" />
            <stop offset="45%" stop-color="#0b3d20" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#0b3d20" stop-opacity="1" />
        </linearGradient>
    </defs>
    <rect x="0" y="${height * 0.3}" width="${width}" height="${height * 0.7}" fill="url(#fade9)" />
    <rect x="0" y="0" width="${width}" height="10" fill="#c1121f" />
    <text x="${width / 2}" y="55" text-anchor="middle" fill="#ffd60a" font-family="Georgia, serif" font-size="28" font-weight="bold">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 54, textBottomY, "Georgia, serif", "#ffffff", "", 24)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 30, "#c1121f", "heart", "HEART", "#ffffff", 40, "right")}
        ${iconBadge(pos.cx2, -14, 30, "#0b6e4f", "thumb", "LIKE", "#ffffff", 40, "right")}
    </g>
</svg>`);
		},
	},

	// 10) Valentine's / Love
	{
		id: "valentine-love",
		svgBuilder: (headline, width, height, pageName) => {
			const safeText = escapeXml(headline);
			const pollY = height - 90;
			const textBottomY = pollY - 140;
			const pos = computeCenteredPair(
				width,
				{ r: 32, label: "LOVE IT", fontSize: 34 },
				{ r: 32, label: "LIKE IT", fontSize: 34 },
				56,
			);
			return Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="fade10" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4a0d24" stop-opacity="0" />
            <stop offset="45%" stop-color="#4a0d24" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#4a0d24" stop-opacity="1" />
        </linearGradient>
        <filter id="loveShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity="0.8" />
        </filter>
    </defs>
    <rect x="0" y="${height * 0.3}" width="${width}" height="${height * 0.7}" fill="url(#fade10)" />
    <text x="${width / 2}" y="58" text-anchor="middle" fill="#ffb3c6" font-family="Georgia, serif" font-size="28" font-weight="bold">${escapeXml(pageName)}</text>
    ${headlineBlock(safeText, width, 54, textBottomY, "Georgia, serif", "#ffffff", 'filter="url(#loveShadow)"', 24)}
    <g transform="translate(0, ${pollY})">
        ${iconBadge(pos.cx1, -14, 32, "#e63950", "heart", "LOVE IT", "#ffffff", 34, "right")}
        ${iconBadge(pos.cx2, -14, 32, "#9d4edd", "thumb", "LIKE IT", "#ffffff", 34, "right")}
    </g>
</svg>`);
		},
	},
];
