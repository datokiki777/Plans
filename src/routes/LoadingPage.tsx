import { useState } from "react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SearchInput } from "@/shared/ui/SearchInput";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { ShareIconButton } from "@/shared/ui/ShareIconButton";
import { loadingRepository } from "@/db/repositories";
import { useLoadingLists } from "@/features/loading/useLoadingLists";
import { LoadingListDialog } from "@/features/loading/LoadingListDialog";
import { LoadingListViewDialog } from "@/features/loading/LoadingListViewDialog";
import { LoadingShareCard } from "@/features/loading/LoadingShareCard";
import { useLoadingShare } from "@/features/loading/useLoadingShare";
import type { LoadingList } from "@/entities/loading-list";
import "./LoadingPage.css";

export default function LoadingPage() {
  const [query, setQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const { lists, reload } = useLoadingLists(query, { includeArchived });
  const [editTarget, setEditTarget] = useState<LoadingList | null | undefined>(undefined);
  const [viewTarget, setViewTarget] = useState<LoadingList | null>(null);
  const showToast = useToast();
  const confirm = useConfirm();
  const { cardRef, activeList, activeItems, sharing, share } = useLoadingShare();

  const handleArchive = async (list: LoadingList) => {
    await loadingRepository.archiveList(list.id);
    reload();
  };

  const handleRestore = async (list: LoadingList) => {
    await loadingRepository.restoreList(list.id);
    reload();
  };

  const handleDelete = async (list: LoadingList) => {
    const ok = await confirm({
      title: "სიის სამუდამო წაშლა",
      message: `„${list.title}“ სამუდამოდ წაიშლება - ეს ქმედება ვერ გაუქმდება.`,
      danger: true
    });
    if (!ok) return;
    await loadingRepository.deleteList(list.id);
    showToast("სია წაიშალა.", "ok");
    reload();
  };

  const handleShare = async (list: LoadingList) => {
    try {
      const outcome = await share(list);
      if (outcome === "shared") showToast("გაზიარება გაიხსნა.", "ok");
      else if (outcome === "downloaded-only")
        showToast("სურათი ჩამოიტვირთა. ეს მოწყობილობა/ბრაუზერი პირდაპირ გაზიარებას ვერ უჭერს მხარს.", "warn");
    } catch (error) {
      console.error("Loading share failed:", error);
      showToast("გაზიარება ვერ განხორციელდა, სცადე თავიდან.", "warn");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Plans"
        title="დატვირთვა"
        actions={
          <Button variant="primary" onClick={() => setEditTarget(null)}>
            + სია
          </Button>
        }
      />

      <div className="loading-page__controls">
        <SearchInput placeholder="მოძებნე სათაურით…" onSearch={setQuery} />
        <label className="loading-page__archived-toggle">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          დაარქივებულების ჩვენება
        </label>
      </div>

      {lists.length === 0 && <EmptyState title="სია არ მოიძებნა" description="დაამატე პირველი დატვირთვის სია ზემოთა ღილაკით." />}

      <div className="loading-page__list">
        {lists.map((list) => (
          <Card key={list.id} className="loading-page__row">
            <button type="button" className="loading-page__row-tap" onClick={() => setViewTarget(list)}>
              <div className="loading-page__row-head">
                <strong>{list.title}</strong>
                {list.archivedAt && <StatusBadge label="დაარქივებული" tone="danger" />}
              </div>
            </button>
            <div className="loading-page__row-actions">
              <ShareIconButton onClick={() => void handleShare(list)} disabled={sharing} />
              <Button onClick={() => setEditTarget(list)}>რედაქტირება</Button>
              {list.archivedAt ? (
                <>
                  <Button onClick={() => void handleRestore(list)}>აღდგენა</Button>
                  <Button variant="danger" onClick={() => void handleDelete(list)}>
                    სამუდამო წაშლა
                  </Button>
                </>
              ) : (
                <Button variant="danger" onClick={() => void handleArchive(list)}>
                  დაარქივება
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <LoadingListViewDialog list={viewTarget} onClose={() => setViewTarget(null)} onEdit={(list) => setEditTarget(list)} />
      <LoadingListDialog open={editTarget !== undefined} onClose={() => setEditTarget(undefined)} list={editTarget} onSaved={reload} />

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <LoadingShareCard ref={cardRef} title={activeList?.title ?? ""} items={activeItems} specialNote={activeList?.specialNote} />
    </div>
  );
}
