import type { DefinitionResult } from '../shared/definitions';
import { LOOKUP_MESSAGE_TYPE, type LookupMessage } from '../shared/messages';
import { DefinitionTooltip } from './tooltip';

let lookupToken = 0;

export async function showDefinition(
  word: string,
  anchorRect: DOMRect,
  tooltip: DefinitionTooltip,
): Promise<void> {
  const currentToken = ++lookupToken;
  tooltip.showLoading(word, anchorRect);

  try {
    const result = await chrome.runtime.sendMessage<DefinitionResult | null>({
      type: LOOKUP_MESSAGE_TYPE,
      word,
    } satisfies LookupMessage);

    if (currentToken !== lookupToken) {
      return;
    }

    if (result) {
      tooltip.showResult(result, anchorRect);
    } else {
      tooltip.showError(word, anchorRect);
    }
  } catch (error) {
    console.warn('Definition lookup failed', error);

    if (currentToken === lookupToken) {
      tooltip.showError(word, anchorRect);
    }
  }
}
