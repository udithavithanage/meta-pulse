/**
 * Cleans caption text by replacing UTF-8 byte sequences
 * for em-dash (—) and en-dash (–) with a standard hyphen (-).
 *
 * @param {string} text - The raw caption text.
 * @returns {string} The cleaned caption text.
 */
export function cleanCaptionText(text: string): string {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const bytes = encoder.encode(text);
	const result: number[] = [];

	for (let i = 0; i < bytes.length; i++) {
		const b0 = bytes[i];
		const b1 = bytes[i + 1];
		const b2 = bytes[i + 2];

		if (b0 === 0xe2 && b1 === 0x80 && b2 === 0x94) {
			result.push(0x2d);
			i += 2;
		} else if (b0 === 0xe2 && b1 === 0x80 && b2 === 0x93) {
			result.push(0x2d);
			i += 2;
		} else if (b0 !== undefined) {
			result.push(b0);
		}
	}

	return decoder.decode(new Uint8Array(result)).trim();
}
