import type { DefinitionResult } from '../shared/definitions';
import { normalizeLookupWord } from '../shared/definitions';
import { cacheDefinition, getCachedDefinition } from './cache';
import { definitionProviders } from './providers';

export async function lookupDefinition(
  word: string,
): Promise<DefinitionResult | null> {
  const normalizedWord = normalizeLookupWord(word);

  if (!normalizedWord) {
    return null;
  }

  const cachedResult = getCachedDefinition(normalizedWord);

  if (cachedResult) {
    return cachedResult;
  }

  for (const provider of definitionProviders) {
    try {
      const result = await provider.lookup(normalizedWord);

      if (result) {
        cacheDefinition(normalizedWord, result);
        return result;
      }
    } catch (error) {
      console.warn(`${provider.name} provider failed`, error);
    }
  }

  return null;
}
