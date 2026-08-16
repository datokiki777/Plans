import { useRef, useState } from "react";
import { loadingRepository } from "@/db/repositories";
import type { LoadingList } from "@/entities/loading-list";
import { buildLoadingShareFilename } from "@/entities/loading-list";
import type { LoadingItem } from "@/entities/loading-item";
import { generateElementImageBlob, shareImage, type ShareOutcome } from "@/services/ShareService";

/** Single reusable offscreen card + share flow for the whole Loading list
 * screen - each row's share button targets this one hook instance rather
 * than mounting a card per row. */
export function useLoadingShare() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeList, setActiveList] = useState<LoadingList | null>(null);
  const [activeItems, setActiveItems] = useState<LoadingItem[]>([]);
  const [sharing, setSharing] = useState(false);

  const share = async (list: LoadingList): Promise<ShareOutcome> => {
    setSharing(true);
    try {
      const items = await loadingRepository.listItems(list.id);
      setActiveList(list);
      setActiveItems(items);
      // Wait for the card to re-render with the fetched items before
      // capturing it, plus the same short settle pause V1 used.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      if (!cardRef.current) throw new Error("Share card not mounted");
      const blob = await generateElementImageBlob(cardRef.current);
      return await shareImage({
        blob,
        filename: buildLoadingShareFilename(list),
        title: list.title || "დატვირთვის სია",
        shareText: ""
      });
    } finally {
      setSharing(false);
    }
  };

  return { cardRef, activeList, activeItems, sharing, share };
}
