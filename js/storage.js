(function () {
  const GUEST_STORAGE_KEY = "taccuino_notes_v4_guest";
  const USER_CACHE_PREFIX = "taccuino_notes_v4_user_";
  const LEGACY_KEYS = ["taccuino_notes_v3", "taccuino_notes_v2", "taccuino_notes_v1"];

  function readKey(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return window.Taccuino.notes.normalizeNotes(parsed);
    } catch (error) {
      console.error("Errore nel caricamento delle note:", error);
      return [];
    }
  }

  function loadGuestNotes() {
    const current = readKey(GUEST_STORAGE_KEY);
    if (current.length) return current;

    for (let index = 0; index < LEGACY_KEYS.length; index += 1) {
      const legacyNotes = readKey(LEGACY_KEYS[index]);
      if (legacyNotes.length) {
        return legacyNotes;
      }
    }

    return [];
  }

  function saveGuestNotes(notes) {
    return saveNotesToKey(GUEST_STORAGE_KEY, notes);
  }

  function clearGuestNotes() {
    try {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Errore nella pulizia delle note locali guest:", error);
      return false;
    }
  }

  function getUserStorageKey(userId) {
    return `${USER_CACHE_PREFIX}${userId}`;
  }

  function loadUserNotes(userId) {
    if (!userId) return [];
    return readKey(getUserStorageKey(userId));
  }

  function saveUserNotes(userId, notes) {
    if (!userId) return false;
    return saveNotesToKey(getUserStorageKey(userId), notes);
  }

  function saveNotesToKey(key, notes) {
    try {
      window.localStorage.setItem(key, JSON.stringify(notes));
      return true;
    } catch (error) {
      console.error("Errore nel salvataggio delle note:", error);
      return false;
    }
  }

  function exportNotes(notes) {
    const payload = {
      version: 4,
      exportedAt: new Date().toISOString(),
      notes
    };

    return JSON.stringify(payload, null, 2);
  }

  function importNotes(rawText) {
    const parsed = JSON.parse(rawText);
    const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.notes) ? parsed.notes : [];
    return window.Taccuino.notes.normalizeNotes(list);
  }

  window.Taccuino = window.Taccuino || {};
  window.Taccuino.storage = {
    loadGuestNotes,
    saveGuestNotes,
    clearGuestNotes,
    loadUserNotes,
    saveUserNotes,
    exportNotes,
    importNotes,
    GUEST_STORAGE_KEY,
    USER_CACHE_PREFIX
  };
})();
