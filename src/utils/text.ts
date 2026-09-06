/**
 * Cleans caption text by replacing AI-characteristic em-dashes and en-dashes with standard natural hyphens.
 *
 * @param {string} text - The raw caption text.
 * @returns {string} The cleaned caption text.
 */
export function cleanCaptionText(text: string): string {
	return (
		text
			// Replace em-dash (—) and en-dash (–) with a standard hyphen with spaces
			.replace(/[\u2014\u2013]/g, " — ")
			// Clean up any potential double spaces created by the replacement
			.replace(/ {2,}/g, " ")
			.trim()
	);
}
