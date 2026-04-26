import {
  type DefinitionProvider,
  type DefinitionResult,
  getSearchUrl,
} from '../shared/definitions';

interface DictionaryApiDefinition {
  definition?: string;
  example?: string;
}

interface DictionaryApiMeaning {
  definitions?: DictionaryApiDefinition[];
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  meanings?: DictionaryApiMeaning[];
  sourceUrls?: string[];
}

export const definitionProviders: DefinitionProvider[] = [
  { name: 'Free Dictionary API', lookup: lookupDictionaryApi },
  { name: 'Local fallback', lookup: lookupLocalFallback },
];

async function lookupLocalFallback(word: string): Promise<DefinitionResult> {
  return {
    word,
    definition:
      'No dictionary definition was found. Try Learn more to search for a detailed explanation.',
    sourceUrl: getSearchUrl(word),
    provider: 'Local fallback',
  };
}

async function lookupDictionaryApi(
  word: string,
): Promise<DefinitionResult | null> {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  );

  if (!response.ok) {
    return null;
  }

  const entries = (await response.json()) as DictionaryApiEntry[];
  const firstEntry = entries[0];
  const firstDefinition = firstEntry?.meanings
    ?.flatMap((meaning) => meaning.definitions ?? [])
    .find((definition) => definition.definition);

  if (!firstDefinition?.definition) {
    return null;
  }

  return {
    word: firstEntry?.word ?? word,
    phonetic: firstEntry?.phonetic,
    definition: firstDefinition.definition,
    example: firstDefinition.example,
    sourceUrl: firstEntry?.sourceUrls?.[0] ?? getSearchUrl(word),
    provider: 'Free Dictionary API',
  };
}
