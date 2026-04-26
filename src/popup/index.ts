import {
  getExtensionPreferences,
  setExtensionEnabled,
  setTemporarilyPaused,
} from '../shared/preferences';

interface CurrentSite {
  key: string;
  label: string;
}

let currentSite: CurrentSite | null = null;

const siteText = getRequiredElement<HTMLDivElement>('[data-site]');
const statusText = getRequiredElement<HTMLParagraphElement>('[data-status]');
const enabledToggle = getRequiredElement<HTMLInputElement>(
  '[data-enabled-toggle]',
);
const pauseButton = getRequiredElement<HTMLButtonElement>(
  '[data-pause-button]',
);

enabledToggle.addEventListener('change', () => {
  if (currentSite) {
    void updateEnabledPreference(currentSite.key, enabledToggle.checked);
  }
});

pauseButton.addEventListener('click', () => {
  if (!currentSite) {
    return;
  }

  const siteKey = currentSite.key;

  void getExtensionPreferences(siteKey)
    .then((preferences) =>
      setTemporarilyPaused(siteKey, !preferences.pausedTemporarily),
    )
    .then(renderPreferences);
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName === 'local') {
    void renderPreferences();
  }
});

void initializePopup();

async function initializePopup(): Promise<void> {
  currentSite = await getCurrentSite();

  if (!currentSite) {
    siteText.textContent = 'This page is not supported';
    statusText.textContent = 'Open a website tab to manage Meaningful there.';
    enabledToggle.disabled = true;
    pauseButton.disabled = true;
    return;
  }

  siteText.textContent = currentSite.label;
  await renderPreferences();
}

async function renderPreferences(): Promise<void> {
  if (!currentSite) {
    return;
  }

  const preferences = await getExtensionPreferences(currentSite.key);

  enabledToggle.checked = preferences.enabled;
  pauseButton.disabled = !preferences.enabled;
  pauseButton.textContent = preferences.pausedTemporarily
    ? 'Resume for this session'
    : 'Pause temporarily';

  if (!preferences.enabled) {
    statusText.textContent = 'Meaningful is off on this site until you turn it back on.';
  } else if (preferences.pausedTemporarily) {
    statusText.textContent = 'Meaningful is paused on this site for this browser session.';
  } else {
    statusText.textContent = 'Meaningful is active on this site.';
  }
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Popup markup is missing ${selector}.`);
  }

  return element;
}

async function updateEnabledPreference(
  siteKey: string,
  enabled: boolean,
): Promise<void> {
  await setExtensionEnabled(siteKey, enabled);

  if (enabled) {
    await setTemporarilyPaused(siteKey, false);
  }

  await renderPreferences();
}

async function getCurrentSite(): Promise<CurrentSite | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.url) {
    return null;
  }

  try {
    const url = new URL(tab.url);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return {
      key: url.origin,
      label: url.hostname,
    };
  } catch {
    return null;
  }
}
