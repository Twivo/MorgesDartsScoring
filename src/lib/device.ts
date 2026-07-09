/**
 * Per-tab device identity, used by the scoring lock to tell devices apart.
 *
 * Stored in sessionStorage: it survives a reload of the same tab (so a scorer
 * keeps its lock across refreshes) but is cleared when the tab closes — which
 * is exactly when the lock should be releasable by others. It is NOT match
 * data, so this does not reintroduce any local caching of games.
 */
const KEY = 'darts:device-id';

export function getDeviceId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage disabled — fall back to a per-session id.
    return 'device-fallback';
  }
}
