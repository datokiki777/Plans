import { forwardRef } from "react";
import type { LoadingItem } from "@/entities/loading-item";
import "./LoadingShareCard.css";

export interface LoadingShareCardProps {
  title: string;
  items: LoadingItem[];
}

function ordinalWord(n: number): string {
  return `${n}.`;
}

function bySortOrder(items: LoadingItem[]): LoadingItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Same section set/order as V1's buildPrintableLoadingContent
 * (js/loading.js): trays, glass (+door), panels, extras. Empty categories
 * are omitted entirely, same as V1. */
export const LoadingShareCard = forwardRef<HTMLDivElement, LoadingShareCardProps>(function LoadingShareCard({ title, items }, ref) {
  const trays = bySortOrder(items.filter((i) => i.category === "trays"));
  const glass = bySortOrder(items.filter((i) => i.category === "glass"));
  const panels = bySortOrder(items.filter((i) => i.category === "panels"));
  const extras = bySortOrder(items.filter((i) => i.category === "extras"));

  return (
    <div ref={ref} className="loading-share-card">
      <h1>Plans — დატვირთვის სია</h1>
      <p className="loading-share-card__subtitle">{title || "დატვირთვის სია"}</p>

      {trays.length > 0 && (
        <section className="loading-share-card__section">
          <h2>დუშთასეები</h2>
          <ul>
            {trays.map((item, i) => (
              <li key={item.id}>
                {ordinalWord(i + 1)} {item.note.trim() || `ჩანაწერი ${i + 1}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {glass.length > 0 && (
        <section className="loading-share-card__section">
          <h2>შუშები (+ კარი)</h2>
          <ul>
            {glass.map((item, i) => {
              const parts = [item.note.trim(), item.doorInfo?.trim() ? `კარი: ${item.doorInfo.trim()}` : ""].filter(Boolean);
              return (
                <li key={item.id}>
                  {ordinalWord(i + 1)} {parts.length ? parts.join(" — ") : `ჩანაწერი ${i + 1}`}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {panels.length > 0 && (
        <section className="loading-share-card__section">
          <h2>პანელები</h2>
          <ul>
            {panels.map((item) => (
              <li key={item.id}>
                {item.name || "—"}
                {item.quantity ? ` × ${item.quantity}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {extras.length > 0 && (
        <section className="loading-share-card__section">
          <h2>სხვა</h2>
          <ul>
            {extras.map((item) => (
              <li key={item.id}>
                {item.name || "—"}
                {item.quantity ? ` × ${item.quantity}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
