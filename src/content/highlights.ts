import { WORD_PATTERN } from './words';

const UNDERLINE_COLORS = [
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
];

const ACTIVE_SELECTION_CLASS = 'meaningful-selection-active';

let activeSpans: HTMLSpanElement[] = [];

export interface HighlightedWord {
  word: string;
  rect: DOMRect;
}

export function injectHighlightStyles(): void {
  if (document.getElementById('meaningful-highlight-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'meaningful-highlight-styles';
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

export function clearHighlights(): void {
  document.documentElement.classList.remove(ACTIVE_SELECTION_CLASS);

  if (activeSpans.length === 0) {
    return;
  }

  for (const span of activeSpans) {
    const parent = span.parentNode;

    if (!parent) {
      continue;
    }

    parent.replaceChild(document.createTextNode(span.textContent ?? ''), span);
    parent.normalize();
  }

  activeSpans = [];
}

export function hasHighlights(): boolean {
  return activeSpans.length > 0;
}

export function highlightSelectionWords(
  range: Range,
  onWordClick: (word: HighlightedWord) => void,
): number {
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

      if (matchIndex === undefined) {
        continue;
      }

      const wordRange = document.createRange();
      wordRange.setStart(textNode, selectedSlice.startOffset + matchIndex);
      wordRange.setEnd(
        textNode,
        selectedSlice.startOffset + matchIndex + word.length,
      );

      const span = document.createElement('span');
      span.className = 'meaningful-word-highlight';
      span.dataset.meaningfulWord = word;
      const underlineColor =
        UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length] ?? '#2563eb';
      span.style.setProperty('--meaningful-underline-color', underlineColor);

      span.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      span.addEventListener('click', (event) => {
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

function getIntersectingTextNodes(range: Range): Text[] {
  const root = range.commonAncestorContainer;
  const walkerRoot =
    root.nodeType === Node.TEXT_NODE ? root.parentNode ?? document.body : root;

  if (
    root.nodeType === Node.TEXT_NODE &&
    rangeIntersectsTextNode(range, root as Text)
  ) {
    return [root as Text];
  }

  const walker = document.createTreeWalker(
    walkerRoot,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.textContent?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return rangeIntersectsTextNode(range, node as Text)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  return textNodes;
}

function rangeIntersectsTextNode(range: Range, textNode: Text): boolean {
  return range.intersectsNode(textNode);
}

function getSelectedSlice(
  range: Range,
  textNode: Text,
): { text: string; startOffset: number } | null {
  const fullText = textNode.textContent ?? '';
  const startOffset =
    range.startContainer === textNode ? range.startOffset : 0;
  const endOffset =
    range.endContainer === textNode ? range.endOffset : fullText.length;

  if (endOffset <= startOffset) {
    return null;
  }

  const text = fullText.slice(startOffset, endOffset);

  return text.trim() ? { text, startOffset } : null;
}
