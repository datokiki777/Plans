/** Whether the given nav target is the currently-open section - matches a
 * sub-path too (e.g. /settings/backup counts as "on /settings"), so the
 * top bar's toggle-close behavior still fires from a deep link. */
export function isOnSection(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
