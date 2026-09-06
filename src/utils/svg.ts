/**
 * Escapes special characters in a string for safe inclusion in XML/SVG.
 * @param text The string to escape.
 * @returns The escaped XML string.
 */
export function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Wraps text into multiple lines based on maximum characters per line.
 * @param text The input text to wrap.
 * @param maxCharsPerLine The maximum characters allowed per line.
 * @returns An array of lines representing the wrapped text.
 */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
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
