"use strict";
(() => {
  // src/shared/preferences.ts
  var ENABLED_STORAGE_KEY = "meaningful:siteEnabled";
  var PAUSED_STORAGE_KEY = "meaningful:sitePausedTemporarily";
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
  async function setExtensionEnabled(siteKey, enabled) {
    const enabledSites = await getStoredPreferenceMap(ENABLED_STORAGE_KEY);
    if (enabled) {
      delete enabledSites[siteKey];
    } else {
      enabledSites[siteKey] = false;
    }
    await chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: enabledSites });
  }
  async function setTemporarilyPaused(siteKey, paused) {
    const pausedSites = await getStoredPreferenceMap(PAUSED_STORAGE_KEY);
    if (paused) {
      pausedSites[siteKey] = true;
    } else {
      delete pausedSites[siteKey];
    }
    await chrome.storage.local.set({ [PAUSED_STORAGE_KEY]: pausedSites });
  }
  async function getStoredPreferenceMap(key) {
    const values = await chrome.storage.local.get({
      [key]: {}
    });
    return getPreferenceMap(values[key]);
  }
  function getPreferenceMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  // src/popup/index.ts
  var currentSite = null;
  var siteText = getRequiredElement("[data-site]");
  var statusText = getRequiredElement("[data-status]");
  var enabledToggle = getRequiredElement(
    "[data-enabled-toggle]"
  );
  var pauseButton = getRequiredElement(
    "[data-pause-button]"
  );
  enabledToggle.addEventListener("change", () => {
    if (currentSite) {
      void updateEnabledPreference(currentSite.key, enabledToggle.checked);
    }
  });
  pauseButton.addEventListener("click", () => {
    if (!currentSite) {
      return;
    }
    const siteKey = currentSite.key;
    void getExtensionPreferences(siteKey).then(
      (preferences) => setTemporarilyPaused(siteKey, !preferences.pausedTemporarily)
    ).then(renderPreferences);
  });
  chrome.storage.onChanged.addListener((_changes, areaName) => {
    if (areaName === "local") {
      void renderPreferences();
    }
  });
  void initializePopup();
  async function initializePopup() {
    currentSite = await getCurrentSite();
    if (!currentSite) {
      siteText.textContent = "This page is not supported";
      statusText.textContent = "Open a website tab to manage Meaningful there.";
      enabledToggle.disabled = true;
      pauseButton.disabled = true;
      return;
    }
    siteText.textContent = currentSite.label;
    await renderPreferences();
  }
  async function renderPreferences() {
    if (!currentSite) {
      return;
    }
    const preferences = await getExtensionPreferences(currentSite.key);
    enabledToggle.checked = preferences.enabled;
    pauseButton.disabled = !preferences.enabled;
    pauseButton.textContent = preferences.pausedTemporarily ? "Resume for this session" : "Pause temporarily";
    if (!preferences.enabled) {
      statusText.textContent = "Meaningful is off on this site until you turn it back on.";
    } else if (preferences.pausedTemporarily) {
      statusText.textContent = "Meaningful is paused on this site for this browser session.";
    } else {
      statusText.textContent = "Meaningful is active on this site.";
    }
  }
  function getRequiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Popup markup is missing ${selector}.`);
    }
    return element;
  }
  async function updateEnabledPreference(siteKey, enabled) {
    await setExtensionEnabled(siteKey, enabled);
    if (enabled) {
      await setTemporarilyPaused(siteKey, false);
    }
    await renderPreferences();
  }
  async function getCurrentSite() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    if (!tab?.url) {
      return null;
    }
    try {
      const url = new URL(tab.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
      return {
        key: url.origin,
        label: url.hostname
      };
    } catch {
      return null;
    }
  }
})();
