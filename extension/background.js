"use strict";
(() => {
  // src/shared/messages.ts
  var LOOKUP_MESSAGE_TYPE = "meaningful:lookup";
  function isLookupMessage(message) {
    return typeof message === "object" && message !== null && "type" in message && "word" in message && message.type === LOOKUP_MESSAGE_TYPE && typeof message.word === "string";
  }

  // src/shared/preferences.ts
  var PAUSED_STORAGE_KEY = "meaningful:sitePausedTemporarily";
  async function clearTemporaryPause() {
    await chrome.storage.local.set({ [PAUSED_STORAGE_KEY]: {} });
  }

  // src/shared/definitions.ts
  function normalizeLookupWord(word) {
    return word.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
  }
  function getSearchUrl(word) {
    return `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
  }

  // src/background/cache.ts
  var MAX_CACHE_ENTRIES = 300;
  var definitionCache = /* @__PURE__ */ new Map();
  function getCachedDefinition(word) {
    return definitionCache.get(word);
  }
  function cacheDefinition(word, result) {
    if (definitionCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = definitionCache.keys().next().value;
      if (oldestKey) {
        definitionCache.delete(oldestKey);
      }
    }
    definitionCache.set(word, result);
  }

  // src/background/providers.ts
  var definitionProviders = [
    { name: "Free Dictionary API", lookup: lookupDictionaryApi },
    { name: "Local fallback", lookup: lookupLocalFallback }
  ];
  async function lookupLocalFallback(word) {
    return {
      word,
      definition: "No dictionary definition was found. Try Learn more to search for a detailed explanation.",
      sourceUrl: getSearchUrl(word),
      provider: "Local fallback"
    };
  }
  async function lookupDictionaryApi(word) {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!response.ok) {
      return null;
    }
    const entries = await response.json();
    const firstEntry = entries[0];
    const firstDefinition = firstEntry?.meanings?.flatMap((meaning) => meaning.definitions ?? []).find((definition) => definition.definition);
    if (!firstDefinition?.definition) {
      return null;
    }
    return {
      word: firstEntry?.word ?? word,
      phonetic: firstEntry?.phonetic,
      definition: firstDefinition.definition,
      example: firstDefinition.example,
      sourceUrl: firstEntry?.sourceUrls?.[0] ?? getSearchUrl(word),
      provider: "Free Dictionary API"
    };
  }

  // src/background/lookup.ts
  async function lookupDefinition(word) {
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

  // src/background/index.ts
  chrome.runtime.onInstalled.addListener(() => {
    void clearTemporaryPause();
  });
  chrome.runtime.onStartup.addListener(() => {
    void clearTemporaryPause();
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isLookupMessage(message)) {
      return false;
    }
    lookupDefinition(message.word).then(sendResponse).catch((error) => {
      console.warn("Definition lookup failed", error);
      sendResponse(null);
    });
    return true;
  });
})();
