export interface DefinitionResult {
  word: string;
  definition: string;
  provider: string;
  phonetic?: string;
  example?: string;
  sourceUrl?: string;
}

export interface DefinitionProvider {
  name: string;
  lookup(word: string): Promise<DefinitionResult | null>;
}

export function normalizeLookupWord(word: string): string {
  return word.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
}

export function getSearchUrl(word: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
}
