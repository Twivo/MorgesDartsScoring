/** Small collision-resistant id generator (no external dependency). */
export function createId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${prefix ? '_' : ''}${time}${rand}`;
}

/** RFC-4122 UUID — required for DB primary keys (uuid columns). */
export function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for very old environments.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
