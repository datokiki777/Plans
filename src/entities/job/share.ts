import type { Job } from "./types";
import { formatDateOnly } from "@/shared/lib/date";
import { normalizeMapsLink } from "@/shared/lib/maps";

/** Same "is there anything to show" rule V1 used (hasValue in js/app.js):
 * an empty/whitespace string or an all-empty array counts as absent, so
 * the share card never renders empty fields. */
export function hasShareValue(value: string | string[] | null | undefined): boolean {
  if (Array.isArray(value)) return value.some((v) => String(v ?? "").trim());
  return Boolean(String(value ?? "").trim());
}

/** "15.08.2026 · 3 დღიანი" - matches V1's formatJobSchedule, omitting
 * whichever half is missing. */
export function formatJobShareSchedule(job: Pick<Job, "jobDate" | "jobDurationDays">): string {
  const dateLabel = job.jobDate ? formatDateOnly(job.jobDate) : "";
  const durationLabel = job.jobDurationDays ? `${job.jobDurationDays} დღიანი` : "";
  if (dateLabel && durationLabel) return `${dateLabel} · ${durationLabel}`;
  return dateLabel || durationLabel;
}

/** Safe PNG filename from the client's name, same pattern V1 used
 * (`${name.replace(/\s+/g, "_")}.png`, falling back to a generic name). */
export function buildJobShareFilename(job: Pick<Job, "clientSnapshot">): string {
  const base = (job.clientSnapshot.fullName || "client").trim().replace(/\s+/g, "_");
  return `${base || "client"}.png`;
}

/** The text shared alongside the image - V1 shares the client's normalized
 * Google Maps link as the share `text`, and only if one is set. */
export function buildJobShareText(googleMapsLink: string | undefined | null): string {
  return googleMapsLink ? normalizeMapsLink(googleMapsLink) : "";
}
