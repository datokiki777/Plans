import { useRef, useState } from "react";
import { clientRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import { buildJobShareFilename, buildJobShareText } from "@/entities/job";
import { generateElementImageBlob, shareImage, type ShareOutcome } from "@/services/ShareService";

/** One reusable offscreen card + share flow. Works both for a single Job
 * screen (JobDetailPage) and a Jobs list (JobsPage) - each row's share
 * button just calls share(job) with whichever job it represents, rather
 * than needing one card mounted per row. Group is intentionally never
 * part of the shared image (per explicit request) - it's still used
 * everywhere else in the app (filtering, data), just not shown here. */
export function useJobShare() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [sharing, setSharing] = useState(false);

  const share = async (job: Job): Promise<ShareOutcome> => {
    setSharing(true);
    try {
      const client = await clientRepository.getById(job.clientId);
      setActiveJob(job);
      // Wait for the card to re-render with this job's data before
      // capturing it, plus the same short settle pause V1 used.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      if (!cardRef.current) throw new Error("Share card not mounted");
      const blob = await generateElementImageBlob(cardRef.current);
      return await shareImage({
        blob,
        filename: buildJobShareFilename(job),
        title: job.clientSnapshot.fullName || "სამუშაო",
        shareText: buildJobShareText(client?.googleMapsLink)
      });
    } finally {
      setSharing(false);
    }
  };

  return { cardRef, activeJob, sharing, share };
}
