import { useEffect, useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { loadingRepository } from "@/db/repositories";
import type { LoadingList } from "@/entities/loading-list";
import type { LoadingItem } from "@/entities/loading-item";
import "./LoadingListViewDialog.css";

export interface LoadingListViewDialogProps {
  list: LoadingList | null;
  onClose: () => void;
  onEdit: (list: LoadingList) => void;
}

const SECTIONS: Array<{ key: string; label: string }> = [
  { key: "trays", label: "დუშთასე" },
  { key: "glass", label: "შუშა" },
  { key: "panels", label: "პანელები" },
  { key: "extras", label: "დამატებითი" }
];

function bySortOrder(items: LoadingItem[]): LoadingItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Just look at what's in this list, without entering edit mode - tapping
 * a row previously did nothing (only the separate 'რედაქტირება' button
 * opened anything, straight into the edit form). This shows the contents
 * read-only first; "რედაქტირება" here switches into the real edit dialog
 * only if something actually needs changing. */
export function LoadingListViewDialog({ list, onClose, onEdit }: LoadingListViewDialogProps) {
  const [items, setItems] = useState<LoadingItem[]>([]);

  useEffect(() => {
    if (!list) return;
    loadingRepository.listItems(list.id).then(setItems);
  }, [list]);

  if (!list) return null;

  return (
    <Dialog
      open={list !== null}
      onClose={onClose}
      title={list.title}
      footer={
        <>
          <Button onClick={onClose}>დახურვა</Button>
          <Button
            variant="primary"
            onClick={() => {
              onEdit(list);
              onClose();
            }}
          >
            რედაქტირება
          </Button>
        </>
      }
    >
      <div className="loading-view">
        {SECTIONS.map(({ key, label }) => {
          const sectionItems = bySortOrder(items.filter((i) => i.category === key));
          if (sectionItems.length === 0) return null;
          return (
            <section key={key} className="loading-view__section">
              <h3>{label}</h3>
              <ul>
                {sectionItems.map((item) => {
                  const parts = [
                    item.name || item.note,
                    item.doorInfo?.trim() ? `კარი: ${item.doorInfo.trim()}` : "",
                    item.quantity ? `× ${item.quantity}` : ""
                  ].filter(Boolean);
                  return <li key={item.id}>{parts.join(" — ") || "—"}</li>;
                })}
              </ul>
            </section>
          );
        })}
        {items.length === 0 && <p className="loading-view__empty">ეს სია ჯერ ცარიელია.</p>}
      </div>
    </Dialog>
  );
}
