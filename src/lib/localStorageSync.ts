import { getYjsSync } from "./yjsSync";

type SyncEntry = {
  value: string | null;
  updatedAt: number;
};

const BLOCKED_KEYS = new Set([
  "incrementum_auth_token",
  "incrementum_user",
  "incrementum_last_sync_version",
  "incrementum_youtube_cookies",
  "incrementum_sync_room",
  "llm-providers-storage",
  "mcp-servers-storage",
  "integration_settings",
]);

const BLOCKED_PREFIXES = [
  "incrementum_auth_",
  "sync_",
];

let initialized = false;

function isBlocked(key: string): boolean {
  if (BLOCKED_KEYS.has(key)) {
    return true;
  }
  return BLOCKED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function initLocalStorageSync(): void {
  if (initialized || typeof window === "undefined" || !window.localStorage) {
    return;
  }

  initialized = true;

  const sync = getYjsSync();
  const map = sync.doc.getMap<SyncEntry>("localStorage");
  const lastApplied = new Map<string, number>();

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  let isApplyingRemote = false;

  const applyRemote = (key: string, entry?: SyncEntry) => {
    if (isApplyingRemote) {
      return;
    }

    isApplyingRemote = true;
    try {
      if (!entry || entry.value === null) {
        originalRemoveItem(key);
      } else {
        originalSetItem(key, entry.value);
      }
      if (entry) {
        lastApplied.set(key, entry.updatedAt);
      }
    } finally {
      isApplyingRemote = false;
    }
  };

  const pushLocal = (key: string, value: string | null) => {
    if (isBlocked(key)) {
      return;
    }

    const now = Date.now();
    map.set(key, { value, updatedAt: now });
    lastApplied.set(key, now);
  };

  // Patch localStorage to broadcast changes through Yjs.
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (!isApplyingRemote) {
      pushLocal(key, value);
    }
  };

  localStorage.removeItem = (key: string) => {
    originalRemoveItem(key);
    if (!isApplyingRemote) {
      pushLocal(key, null);
    }
  };

  localStorage.clear = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && !isBlocked(key)) {
        keys.push(key);
      }
    }

    originalClear();

    if (!isApplyingRemote) {
      keys.forEach((key) => {
        pushLocal(key, null);
      });
    }
  };

  // Initial merge: if the map is empty, seed from localStorage.
  if (map.size === 0) {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || isBlocked(key)) {
        continue;
      }
      const value = localStorage.getItem(key);
      if (value !== null) {
        pushLocal(key, value);
      }
    }
  } else {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || isBlocked(key)) {
        continue;
      }
      if (!map.has(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          pushLocal(key, value);
        }
      }
    }

    map.forEach((entry, key) => {
      if (isBlocked(key)) {
        return;
      }
      applyRemote(key, entry);
    });
  }

  map.observe((event) => {
    event.keysChanged.forEach((key) => {
      if (isBlocked(key)) {
        return;
      }
      const entry = map.get(key);
      const last = lastApplied.get(key);
      if (entry && last === entry.updatedAt) {
        return;
      }
      applyRemote(key, entry);
    });
  });
}
