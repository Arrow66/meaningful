export function getRangeRect(range: Range): DOMRect | null {
  const firstRect = range.getClientRects()[0];

  if (firstRect) {
    return firstRect;
  }

  const rect = range.getBoundingClientRect();

  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  return null;
}

export function clearNativeSelection(): void {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  try {
    selection.removeAllRanges();
  } catch (error) {
    console.warn('Could not clear selection', error);
  }
}

export function isExtensionInteraction(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        '.meaningful-word-highlight, #meaningful-definition-tooltip',
      ),
    )
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
      ),
    )
  );
}

export function runWhenIdle(callback: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 250 });
    return;
  }

  globalThis.setTimeout(callback, 0);
}
