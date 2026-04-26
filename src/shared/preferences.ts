const ENABLED_STORAGE_KEY = 'meaningful:siteEnabled';
const PAUSED_STORAGE_KEY = 'meaningful:sitePausedTemporarily';

type SitePreferenceMap = Record<string, boolean>;

export interface ExtensionPreferences {
  enabled: boolean;
  pausedTemporarily: boolean;
  active: boolean;
}

export function isPreferenceStorageChange(
  changes: Record<string, chrome.storage.StorageChange>,
): boolean {
  return ENABLED_STORAGE_KEY in changes || PAUSED_STORAGE_KEY in changes;
}

export async function getExtensionPreferences(
  siteKey: string,
): Promise<ExtensionPreferences> {
  const localValues = await chrome.storage.local.get<Record<string, unknown>>({
    [ENABLED_STORAGE_KEY]: {},
    [PAUSED_STORAGE_KEY]: {},
  });
  const enabledSites = getPreferenceMap(localValues[ENABLED_STORAGE_KEY]);
  const pausedSites = getPreferenceMap(localValues[PAUSED_STORAGE_KEY]);

  const enabled = enabledSites[siteKey] !== false;
  const pausedTemporarily = pausedSites[siteKey] === true;

  return {
    enabled,
    pausedTemporarily,
    active: enabled && !pausedTemporarily,
  };
}

export async function setExtensionEnabled(
  siteKey: string,
  enabled: boolean,
): Promise<void> {
  const enabledSites = await getStoredPreferenceMap(ENABLED_STORAGE_KEY);

  if (enabled) {
    delete enabledSites[siteKey];
  } else {
    enabledSites[siteKey] = false;
  }

  await chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: enabledSites });
}

export async function setTemporarilyPaused(
  siteKey: string,
  paused: boolean,
): Promise<void> {
  const pausedSites = await getStoredPreferenceMap(PAUSED_STORAGE_KEY);

  if (paused) {
    pausedSites[siteKey] = true;
  } else {
    delete pausedSites[siteKey];
  }

  await chrome.storage.local.set({ [PAUSED_STORAGE_KEY]: pausedSites });
}

export async function clearTemporaryPause(): Promise<void> {
  await chrome.storage.local.set({ [PAUSED_STORAGE_KEY]: {} });
}

async function getStoredPreferenceMap(key: string): Promise<SitePreferenceMap> {
  const values = await chrome.storage.local.get<Record<string, unknown>>({
    [key]: {},
  });

  return getPreferenceMap(values[key]);
}

function getPreferenceMap(value: unknown): SitePreferenceMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as SitePreferenceMap) };
}
