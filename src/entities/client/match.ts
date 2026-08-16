import type { Client } from "./types";

function normalizeNameKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ka");
}

/** Same conservative, non-fuzzy rule used by the V1 migration importer
 * (features/legacy-import/transform.ts): normalized full name AND (phone if
 * present, else address if present). No match key at all means "never
 * merge" - used when the simplified Job form (no separate client picker)
 * needs to find-or-create the underlying Client behind the scenes. */
export function findMatchingClient(
  clients: Client[],
  candidate: { fullName: string; phone: string; address: string }
): Client | undefined {
  const name = normalizeNameKey(candidate.fullName);
  if (!name) return undefined;
  const phone = candidate.phone.trim();
  const address = candidate.address.trim();

  return clients.find((c) => {
    if (normalizeNameKey(c.fullName) !== name) return false;
    if (phone) return c.phone.trim() === phone;
    if (address) return c.address.trim() === address;
    return false;
  });
}
