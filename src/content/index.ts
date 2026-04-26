import {
  MAX_HIGHLIGHTED_WORDS,
  MAX_SELECTION_CHARS,
  SELECTION_CLEANUP_DEBOUNCE_MS,
  SELECTION_DEBOUNCE_MS,
} from './config';
import {
  isEditableTarget,
  isExtensionInteraction,
  runWhenIdle,
} from './dom';
import {
  clearHighlights,
  hasHighlights,
  highlightSelectionWords,
  injectHighlightStyles,
} from './highlights';
import { showDefinition } from './lookup';
import { DefinitionTooltip } from './tooltip';
import { getWords } from './words';
import {
  getExtensionPreferences,
  isPreferenceStorageChange,
} from '../shared/preferences';

injectHighlightStyles();

const tooltip = new DefinitionTooltip();
const currentSiteKey = window.location.origin;
let selectionTimer: number | undefined;
let cleanupTimer: number | undefined;
let preserveHighlightsAfterSelectionMutation = false;
let extensionActive = true;

void refreshExtensionState();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === 'local' &&
    isPreferenceStorageChange(changes)
  ) {
    void refreshExtensionState();
  }
});

document.addEventListener('selectionchange', () => {
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

document.addEventListener('mouseup', (event) => {
  if (isExtensionInteraction(event.target) || isEditableTarget(event.target)) {
    return;
  }

  handleSelection();
}, { passive: true });

document.addEventListener('keyup', (event) => {
  if (event.key === 'Escape') {
    clearSelectionUi();
    return;
  }

  if (!isEditableTarget(event.target) && !isCopyPasteShortcut(event)) {
    handleSelection();
  }
}, { passive: true });

function handleSelection(): void {
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

function hasActiveSelection(): boolean {
  const selection = window.getSelection();

  return Boolean(
    selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      selection.toString().trim(),
  );
}

function clearSelectionUi(): void {
  if (!hasSelectionUi()) {
    return;
  }

  clearHighlights();
  tooltip.hide();
}

function hasSelectionUi(): boolean {
  return hasHighlights() || tooltip.isVisible();
}

function isCopyPasteShortcut(event: KeyboardEvent): boolean {
  const shortcutKey = event.key.toLowerCase();

  return (
    event.ctrlKey ||
    event.metaKey ||
    shortcutKey === 'control' ||
    shortcutKey === 'meta' ||
    shortcutKey === 'alt' ||
    shortcutKey === 'shift'
  );
}

async function refreshExtensionState(): Promise<void> {
  try {
    const preferences = await getExtensionPreferences(currentSiteKey);
    extensionActive = preferences.active;

    if (!extensionActive) {
      clearSelectionUi();
    }
  } catch (error) {
    console.warn('Meaningful preference lookup failed', error);
    extensionActive = true;
  }
}
