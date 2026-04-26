export const WORD_PATTERN = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;

export function getWords(
  text: string,
  limit = Number.POSITIVE_INFINITY,
): string[] {
  const words: string[] = [];
  let match: RegExpExecArray | null;

  WORD_PATTERN.lastIndex = 0;

  while ((match = WORD_PATTERN.exec(text)) && words.length < limit) {
    words.push(match[0]);
  }

  return words;
}
