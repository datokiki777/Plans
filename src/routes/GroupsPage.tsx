import { useState } from "react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/fields";
import { Button } from "@/shared/ui/Button";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { groupRepository } from "@/db/repositories";
import { canPermanentlyDeleteGroup, type Group } from "@/entities/group";
import { useGroups, type GroupWithJobCount } from "@/features/groups/useGroups";
import { GroupForm } from "@/features/groups/GroupForm";
import { GroupPeriodsDialog } from "@/features/groups/GroupPeriodsDialog";
import "./GroupsPage.css";

/** Archiving is back (it was removed for a while on the theory that
 * there'd only ever be a handful of groups, but in practice an old
 * group still needs a way to be hidden from day-to-day use without
 * permanent delete, which stays blocked while any job is attached).
 * Hidden from the default list, same as jobs/loading lists - a toggle
 * reveals them, with restore/permanent-delete actions. */
export default function GroupsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { groups, reload } = useGroups({ includeArchived });
  const [newName, setNewName] = useState("");
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [periodsTarget, setPeriodsTarget] = useState<Group | null>(null);
  const showToast = useToast();
  const confirm = useConfirm();

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await groupRepository.create({ name });
    setNewName("");
    reload();
  };

  const handleArchive = async (id: string) => {
    await groupRepository.archive(id);
    reload();
  };

  const handleRestore = async (id: string) => {
    await groupRepository.restore(id);
    reload();
  };

  const handleDelete = async (id: string, name: string, jobCount: number) => {
    if (!canPermanentlyDeleteGroup(jobCount)) {
      showToast(
        `„${name}“ ვერ წაიშლება სამუდამოდ - მასზეა მიბმული ${jobCount} სამუშაო (დაარქივებულებიც შედის ამ რიცხვში). საჭიროა თითოეული სამუშაო წაშალო ან სხვა ჯგუფზე გადაანაწილო.`,
        "warn"
      );
      return;
    }
    const ok = await confirm({ title: "სამუდამო წაშლა", message: `„${name}“ სამუდამოდ წაიშლება. გავაგრძელოთ?`, danger: true });
    if (!ok) return;
    await groupRepository.delete(id);
    reload();
  };

  return (
    <div>
      <PageHeader eyebrow="Plans" title="ჯგუფები" />

      <div className="groups-page__add-row">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="ახალი ჯგუფის დასახელება"
        />
        <Button variant="primary" onClick={() => void handleCreate()}>
          + ჯგუფი
        </Button>
      </div>

      <label className="groups-page__archived-toggle">
        <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
        დაარქივებულების ჩვენება
      </label>

      {groups.length === 0 && <EmptyState title="ჯგუფი ჯერ არ არის" description="შექმენი პირველი ჯგუფი ზემოთ." />}

      <div className="groups-page__list">
        {groups.map((g: GroupWithJobCount) => (
          <Card key={g.id} className={`groups-page__row${g.archivedAt ? " groups-page__row--archived" : ""}`}>
            <div className="groups-page__row-head">
              {g.carNumber !== null && (
                <span className="groups-page__car-badge" aria-hidden="true">
                  🚐 {g.carNumber}
                </span>
              )}
              <strong>{g.name}</strong>
              {g.archivedAt && <StatusBadge label="დაარქივებული" tone="danger" />}
              <span className="groups-page__count">{g.jobCount} სამუშაო</span>
            </div>
            {(g.worker1Name || g.worker2Name) && (
              <p className="groups-page__workers">{[g.worker1Name, g.worker2Name].filter(Boolean).join(", ")}</p>
            )}
            <div className="groups-page__actions">
              <Button onClick={() => setEditTarget(g)}>რედაქტირება</Button>
              <Button onClick={() => setPeriodsTarget(g)}>პერიოდები</Button>
              {g.archivedAt ? (
                <Button onClick={() => void handleRestore(g.id)}>აღდგენა</Button>
              ) : (
                <Button variant="danger" onClick={() => void handleArchive(g.id)}>
                  დაარქივება
                </Button>
              )}
              <Button variant="danger" onClick={() => void handleDelete(g.id, g.name, g.jobCount)}>
                სამუდამო წაშლა
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <GroupForm open={editTarget !== null} onClose={() => setEditTarget(null)} group={editTarget} onSaved={reload} />
      <GroupPeriodsDialog group={periodsTarget} onClose={() => setPeriodsTarget(null)} />
    </div>
  );
}
