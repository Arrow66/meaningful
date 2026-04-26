import { isLookupMessage } from '../shared/messages';
import { clearTemporaryPause } from '../shared/preferences';
import { lookupDefinition } from './lookup';

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

  lookupDefinition(message.word)
    .then(sendResponse)
    .catch((error) => {
      console.warn('Definition lookup failed', error);
      sendResponse(null);
    });

  return true;
});
