"use strict";
(() => {
  // src/content/config.ts
  var SELECTION_DEBOUNCE_MS = 80;
  var SELECTION_CLEANUP_DEBOUNCE_MS = 40;
  var MAX_SELECTION_CHARS = 3e3;
  var MAX_HIGHLIGHTED_WORDS = 80;

  // src/content/dom.ts
  function isExtensionInteraction(target) {
    return target instanceof Element && Boolean(
      target.closest(
        ".meaningful-word-highlight, #meaningful-definition-tooltip"
      )
    );
  }
  function isEditableTarget(target) {
    return target instanceof Element && Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""]'
      )
    );
  }
  function runWhenIdle(callback) {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(callback, { timeout: 250 });
      return;
    }
    globalThis.setTimeout(callback, 0);
  }

  // src/content/words.ts
  var WORD_PATTERN = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;
  function getWords(text, limit = Number.POSITIVE_INFINITY) {
    const words = [];
    let match;
    WORD_PATTERN.lastIndex = 0;
    while ((match = WORD_PATTERN.exec(text)) && words.length < limit) {
      words.push(match[0]);
    }
    return words;
  }

  // src/content/highlights.ts
  var UNDERLINE_COLORS = [
    "#e11d48",
    "#2563eb",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2"
  ];
  var ACTIVE_SELECTION_CLASS = "meaningful-selection-active";
  var activeSpans = [];
  function injectHighlightStyles() {
    if (document.getElementById("meaningful-highlight-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "meaningful-highlight-styles";
    style.textContent = `
    .meaningful-word-highlight {
      border-radius: 2px;
      cursor: pointer;
      background: rgba(147, 197, 253, 0.16);
      box-shadow: inset 0 -3px var(--meaningful-underline-color, #2563eb);
      transition: background 120ms ease;
    }

    .meaningful-word-highlight:hover {
      background: rgba(96, 165, 250, 0.24);
    }

    .meaningful-word-highlight::selection {
      background: rgba(147, 197, 253, 0.14);
      color: inherit;
    }

    :root.${ACTIVE_SELECTION_CLASS}::selection,
    :root.${ACTIVE_SELECTION_CLASS} ::selection {
      background: rgba(147, 197, 253, 0.14);
      color: inherit;
    }
  `;
    document.documentElement.append(style);
  }
  function clearHighlights() {
    document.documentElement.classList.remove(ACTIVE_SELECTION_CLASS);
    if (activeSpans.length === 0) {
      return;
    }
    for (const span of activeSpans) {
      const parent = span.parentNode;
      if (!parent) {
        continue;
      }
      parent.replaceChild(document.createTextNode(span.textContent ?? ""), span);
      parent.normalize();
    }
    activeSpans = [];
  }
  function hasHighlights() {
    return activeSpans.length > 0;
  }
  function highlightSelectionWords(range, onWordClick) {
    const textNodes = getIntersectingTextNodes(range);
    let colorIndex = 0;
    let highlightCount = 0;
    for (const textNode of textNodes) {
      const selectedSlice = getSelectedSlice(range, textNode);
      if (!selectedSlice) {
        continue;
      }
      const matches = [...selectedSlice.text.matchAll(WORD_PATTERN)].reverse();
      for (const match of matches) {
        const word = match[0];
        const matchIndex = match.index;
        if (matchIndex === void 0) {
          continue;
        }
        const wordRange = document.createRange();
        wordRange.setStart(textNode, selectedSlice.startOffset + matchIndex);
        wordRange.setEnd(
          textNode,
          selectedSlice.startOffset + matchIndex + word.length
        );
        const span = document.createElement("span");
        span.className = "meaningful-word-highlight";
        span.dataset.meaningfulWord = word;
        const underlineColor = UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length] ?? "#2563eb";
        span.style.setProperty("--meaningful-underline-color", underlineColor);
        span.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        span.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onWordClick({ word, rect: span.getBoundingClientRect() });
        });
        wordRange.surroundContents(span);
        activeSpans.push(span);
        colorIndex += 1;
        highlightCount += 1;
      }
    }
    if (highlightCount > 0) {
      document.documentElement.classList.add(ACTIVE_SELECTION_CLASS);
    }
    return highlightCount;
  }
  function getIntersectingTextNodes(range) {
    const root = range.commonAncestorContainer;
    const walkerRoot = root.nodeType === Node.TEXT_NODE ? root.parentNode ?? document.body : root;
    if (root.nodeType === Node.TEXT_NODE && rangeIntersectsTextNode(range, root)) {
      return [root];
    }
    const walker = document.createTreeWalker(
      walkerRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.textContent?.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return rangeIntersectsTextNode(range, node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }
    return textNodes;
  }
  function rangeIntersectsTextNode(range, textNode) {
    return range.intersectsNode(textNode);
  }
  function getSelectedSlice(range, textNode) {
    const fullText = textNode.textContent ?? "";
    const startOffset = range.startContainer === textNode ? range.startOffset : 0;
    const endOffset = range.endContainer === textNode ? range.endOffset : fullText.length;
    if (endOffset <= startOffset) {
      return null;
    }
    const text = fullText.slice(startOffset, endOffset);
    return text.trim() ? { text, startOffset } : null;
  }

  // src/shared/messages.ts
  var LOOKUP_MESSAGE_TYPE = "meaningful:lookup";

  // src/content/lookup.ts
  var lookupToken = 0;
  async function showDefinition(word, anchorRect, tooltip2) {
    const currentToken = ++lookupToken;
    tooltip2.showLoading(word, anchorRect);
    try {
      const result = await chrome.runtime.sendMessage({
        type: LOOKUP_MESSAGE_TYPE,
        word
      });
      if (currentToken !== lookupToken) {
        return;
      }
      if (result) {
        tooltip2.showResult(result, anchorRect);
      } else {
        tooltip2.showError(word, anchorRect);
      }
    } catch (error) {
      console.warn("Definition lookup failed", error);
      if (currentToken === lookupToken) {
        tooltip2.showError(word, anchorRect);
      }
    }
  }

  // src/content/tooltip.ts
  var DefinitionTooltip = class {
    host;
    root;
    sourceUrl;
    constructor() {
      this.host = document.createElement("div");
      this.host.id = "meaningful-definition-tooltip";
      this.host.style.position = "fixed";
      this.host.style.zIndex = "2147483647";
      this.host.style.display = "none";
      this.root = this.host.attachShadow({ mode: "open" });
      document.documentElement.append(this.host);
      this.host.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
    }
    showLoading(word, anchorRect) {
      this.sourceUrl = void 0;
      this.render("loading", {
        word,
        definition: "Looking up definition...",
        provider: "Meaningful"
      });
      this.position(anchorRect);
    }
    showResult(result, anchorRect) {
      this.sourceUrl = result.sourceUrl;
      this.render("result", result);
      this.position(anchorRect);
    }
    showError(word, anchorRect) {
      this.sourceUrl = `https://www.google.com/search?q=${encodeURIComponent(`define ${word}`)}`;
      this.render("error", {
        word,
        definition: "Definition unavailable. You can still search for more detail.",
        provider: "Meaningful"
      });
      this.position(anchorRect);
    }
    hide() {
      if (this.host.style.display === "none") {
        return;
      }
      this.host.style.display = "none";
    }
    isVisible() {
      return this.host.style.display !== "none";
    }
    render(state, result) {
      this.root.innerHTML = "";
      this.root.append(createTooltipStyles());
      const card = document.createElement("section");
      card.className = "card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-live", "polite");
      const closeButton = document.createElement("button");
      closeButton.className = "close";
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close definition");
      closeButton.textContent = "x";
      closeButton.addEventListener("click", () => this.hide());
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = result.word;
      const phonetic = document.createElement("div");
      phonetic.className = "phonetic";
      phonetic.textContent = result.phonetic ?? result.provider;
      const definition = document.createElement("p");
      definition.className = state === "error" ? "definition error" : "definition";
      definition.textContent = result.definition;
      const actions = document.createElement("div");
      actions.className = "actions";
      const learnMoreButton = document.createElement("button");
      learnMoreButton.className = "learn-more";
      learnMoreButton.type = "button";
      learnMoreButton.textContent = "Learn more";
      learnMoreButton.disabled = state === "loading";
      learnMoreButton.addEventListener("click", () => {
        if (this.sourceUrl) {
          window.open(this.sourceUrl, "_blank", "noopener,noreferrer");
        }
      });
      actions.append(learnMoreButton);
      card.append(closeButton, title, phonetic, definition);
      if (result.example) {
        const example = document.createElement("p");
        example.className = "example";
        example.textContent = `"${result.example}"`;
        card.append(example);
      }
      card.append(actions);
      this.root.append(card);
    }
    position(anchorRect) {
      const margin = 10;
      const top = Math.max(
        margin,
        Math.min(anchorRect.bottom + margin, window.innerHeight - 160)
      );
      const left = Math.max(
        margin,
        Math.min(anchorRect.left, window.innerWidth - 330)
      );
      this.host.style.top = `${top}px`;
      this.host.style.left = `${left}px`;
      this.host.style.display = "block";
    }
  };
  function createTooltipStyles() {
    const style = document.createElement("style");
    style.textContent = `
    .card {
      box-sizing: border-box;
      width: min(320px, calc(100vw - 20px));
      padding: 14px 16px 12px;
      border: 1px solid rgba(15, 23, 42, 0.14);
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
      color: #111827;
      font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .close {
      position: absolute;
      top: 8px;
      right: 10px;
      width: 24px;
      height: 24px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }

    .close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .title {
      max-width: 250px;
      color: #0f172a;
      font-size: 17px;
      font-weight: 700;
      text-transform: capitalize;
    }

    .phonetic {
      margin-top: 2px;
      color: #64748b;
      font-size: 12px;
    }

    .definition {
      margin: 10px 0 0;
    }

    .definition.error {
      color: #9f1239;
    }

    .example {
      margin: 8px 0 0;
      color: #475569;
      font-size: 13px;
      font-style: italic;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .learn-more {
      border: 0;
      border-radius: 999px;
      background: #2563eb;
      color: #ffffff;
      cursor: pointer;
      font-weight: 650;
      padding: 7px 12px;
    }

    .learn-more:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  `;
    return style;
  }

  // src/shared/preferences.ts
  var ENABLED_STORAGE_KEY = "meaningful:siteEnabled";
  var PAUSED_STORAGE_KEY = "meaningful:sitePausedTemporarily";
  function isPreferenceStorageChange(changes) {
    return ENABLED_STORAGE_KEY in changes || PAUSED_STORAGE_KEY in changes;
  }
  async function getExtensionPreferences(siteKey) {
    const localValues = await chrome.storage.local.get({
      [ENABLED_STORAGE_KEY]: {},
      [PAUSED_STORAGE_KEY]: {}
    });
    const enabledSites = getPreferenceMap(localValues[ENABLED_STORAGE_KEY]);
    const pausedSites = getPreferenceMap(localValues[PAUSED_STORAGE_KEY]);
    const enabled = enabledSites[siteKey] !== false;
    const pausedTemporarily = pausedSites[siteKey] === true;
    return {
      enabled,
      pausedTemporarily,
      active: enabled && !pausedTemporarily
    };
  }
  function getPreferenceMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  // src/content/index.ts
  injectHighlightStyles();
  var tooltip = new DefinitionTooltip();
  var currentSiteKey = window.location.origin;
  var selectionTimer;
  var cleanupTimer;
  var preserveHighlightsAfterSelectionMutation = false;
  var extensionActive = true;
  void refreshExtensionState();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && isPreferenceStorageChange(changes)) {
      void refreshExtensionState();
    }
  });
  document.addEventListener("selectionchange", () => {
    window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(() => {
      if (!hasSelectionUi()) {
        return;
      }
      if (!hasActiveSelection()) {
        if (preserveHighlightsAfterSelectionMutation) {
          preserveHighlightsAfterSelectionMutation = false;
          return;
        }
        clearSelectionUi();
      }
    }, SELECTION_CLEANUP_DEBOUNCE_MS);
  });
  document.addEventListener("mouseup", (event) => {
    if (isExtensionInteraction(event.target) || isEditableTarget(event.target)) {
      return;
    }
    handleSelection();
  }, { passive: true });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      clearSelectionUi();
      return;
    }
    if (!isEditableTarget(event.target) && !isCopyPasteShortcut(event)) {
      handleSelection();
    }
  }, { passive: true });
  function handleSelection() {
    window.clearTimeout(selectionTimer);
    if (!extensionActive) {
      clearSelectionUi();
      return;
    }
    selectionTimer = window.setTimeout(() => {
      if (!extensionActive) {
        clearSelectionUi();
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        clearSelectionUi();
        return;
      }
      const selectedText = selection.toString().trim();
      if (selectedText.length > MAX_SELECTION_CHARS) {
        clearHighlights();
        tooltip.hide();
        return;
      }
      const words = getWords(selectedText, MAX_HIGHLIGHTED_WORDS + 1);
      if (words.length === 0) {
        return;
      }
      const range = selection.getRangeAt(0).cloneRange();
      clearHighlights();
      if (words.length > MAX_HIGHLIGHTED_WORDS) {
        clearHighlights();
        tooltip.hide();
        return;
      }
      runWhenIdle(() => {
        const highlightCount = highlightSelectionWords(range, (highlightedWord) => {
          void showDefinition(highlightedWord.word, highlightedWord.rect, tooltip);
        });
        if (highlightCount > 0) {
          preserveHighlightsAfterSelectionMutation = true;
          tooltip.hide();
        }
      });
    }, SELECTION_DEBOUNCE_MS);
  }
  function hasActiveSelection() {
    const selection = window.getSelection();
    return Boolean(
      selection && selection.rangeCount > 0 && !selection.isCollapsed && selection.toString().trim()
    );
  }
  function clearSelectionUi() {
    if (!hasSelectionUi()) {
      return;
    }
    clearHighlights();
    tooltip.hide();
  }
  function hasSelectionUi() {
    return hasHighlights() || tooltip.isVisible();
  }
  function isCopyPasteShortcut(event) {
    const shortcutKey = event.key.toLowerCase();
    return event.ctrlKey || event.metaKey || shortcutKey === "control" || shortcutKey === "meta" || shortcutKey === "alt" || shortcutKey === "shift";
  }
  async function refreshExtensionState() {
    try {
      const preferences = await getExtensionPreferences(currentSiteKey);
      extensionActive = preferences.active;
      if (!extensionActive) {
        clearSelectionUi();
      }
    } catch (error) {
      console.warn("Meaningful preference lookup failed", error);
      extensionActive = true;
    }
  }
})();
