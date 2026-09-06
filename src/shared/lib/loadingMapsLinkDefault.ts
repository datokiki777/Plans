const STORAGE_KEY = "plans-loading-default-maps-link";

/** The loading list's Google Maps link rarely changes between lists (same
 * warehouse/pickup location every time) - so instead of retyping it for
 * every new list, whatever was last saved (in any list, new or edited)
 * becomes the default that pre-fills the next new list, until changed
 * again. Plain localStorage, not part of the Dexie data model - this is
 * a UI convenience default, not data that needs to be backed up/restored. */
export function getDefaultLoadingMapsLink(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDefaultLoadingMapsLink(value: string): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private browsing, quota, etc.) - the default
    // just won't persist, which is a harmless degradation, not an error
    // worth surfacing to the person filling in a loading list.
  }
}
