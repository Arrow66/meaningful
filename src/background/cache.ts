import type { DefinitionResult } from '../shared/definitions';

const MAX_CACHE_ENTRIES = 300;
const definitionCache = new Map<string, DefinitionResult>();

export function getCachedDefinition(word: string): DefinitionResult | undefined {
  return definitionCache.get(word);
}

export function cacheDefinition(word: string, result: DefinitionResult): void {
  if (definitionCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = definitionCache.keys().next().value;

    if (oldestKey) {
      definitionCache.delete(oldestKey);
    }
  }

  definitionCache.set(word, result);
}
