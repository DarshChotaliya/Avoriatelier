// localStorage helpers for the temporary browser-only invoice stores.

export function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
}

export function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    throw new Error('Could not save in this browser (storage full or blocked). Try fewer photos.');
  }
}

let idCounter = 0;
/** Unique id even when several records are saved in the same millisecond. */
export const newId = () => `${Date.now()}-${(idCounter += 1)}`;

/** Next running number after the highest one with this prefix, e.g. SAL-00007 → SAL-00008. */
export function nextNumber(prefix, taken) {
  const max = taken
    .filter((n) => n && n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}
