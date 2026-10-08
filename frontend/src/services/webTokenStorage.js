// Storage may be unavailable in private/restricted browsers. The current session
// can still run in memory; persistence is best-effort in that case.
export function createWebTokenStorage(getLocal, getLegacy) {
  const key = 'letsgym.token';
  let memory = null;
  function read(getStorage) {
    try { return getStorage().getItem(key); } catch { return null; }
  }
  function write(getStorage, value) {
    try {
      const storage = getStorage();
      if (value) storage.setItem(key, value);
      else storage.removeItem(key);
    } catch { /* Keep the in-memory session usable when storage is blocked. */ }
  }
  return {
    get() {
      const saved = read(getLocal);
      if (saved) return (memory = saved);
      const legacy = read(getLegacy);
      if (legacy) {
        memory = legacy;
        write(getLocal, legacy);
        // Retain the old session if persistent storage could not be written.
        if (read(getLocal) === legacy) write(getLegacy, null);
      }
      return memory;
    },
    set(value) {
      memory = value;
      write(getLocal, value);
      write(getLegacy, null);
    },
  };
}
