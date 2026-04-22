/**
 * A small hardcoded list of common profanity to mask.
 * Words are matched case-insensitively as whole words.
 * Extend this list as needed.
 */

const SWEAR_WORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "cock",
  "pussy", "bastard", "damn", "ass", "piss", "crap", "slut",
  "whore", "faggot", "nigger", "nigga", "motherfucker", "motherfucking",
];

// Pre-compile a single regex that matches any of the words (whole-word, case-insensitive)
const SWEAR_REGEX = new RegExp(
  `\\b(${SWEAR_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

/**
 * Replaces all profanity in the given text with asterisks of the same length.
 * e.g. "what the fuck" → "what the ****"
 */
export function filterProfanity(text: string): string {
  return text.replace(SWEAR_REGEX, (match) => "*".repeat(match.length));
}

/**
 * Returns true if the text contains any profanity.
 */
export function containsProfanity(text: string): boolean {
  SWEAR_REGEX.lastIndex = 0;
  return SWEAR_REGEX.test(text);
}
