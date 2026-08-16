import { useRef, useState } from "react";
import { clientRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import { buildJobShareFilename, buildJobShareText } from "@/entities/job";
import { generateElementImageBlob, shareImage, type ShareOutcome } from "@/services/ShareService";

export function useJobShare(job: Job) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const share = async (): Promise<ShareOutcome> => {
    setSharing(true);
    try {
      const client = await clientRepository.getById(job.clientId);
      if (!cardRef.current) throw new Error("Share card not mounted");
      // A short delay lets the card's fonts/layout settle before html2canvas
      // rasterizes it - same 60ms pause V1 used (generateReportImageBlob).
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      const blob = await generateElementImageBlob(cardRef.current);
      return await shareImage({
        blob,
        filename: buildJobShareFilename(job),
        title: job.clientSnapshot.fullName || "კლიენტი",
        shareText: buildJobShareText(client?.googleMapsLink)
      });
    } finally {
      setSharing(false);
    }
  };

  return { cardRef, sharing, share };
}
