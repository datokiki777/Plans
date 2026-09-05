import { useState } from "react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/fields";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { groupRepository } from "@/db/repositories";
import { canPermanentlyDeleteGroup, type Group } from "@/entities/group";
import { useGroups, type GroupWithJobCount } from "@/features/groups/useGroups";
import { GroupForm } from "@/features/groups/GroupForm";
import { GroupPeriodsDialog } from "@/features/groups/GroupPeriodsDialog";
import "./GroupsPage.css";

/** Groups don't archive anymore - there are only ever a handful of them
 * (cars/crews), so the only lifecycle action is permanent delete (still
 * blocked while any job - active or archived - is attached, see
 * canPermanentlyDeleteGroup). Archiving now belongs to what actually
 * accumulates over time within a group: its periods and loading lists. */
export default function GroupsPage() {
  const { groups, reload } = useGroups({ includeArchived: false });
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

      {groups.length === 0 && <EmptyState title="ჯგუფი ჯერ არ არის" description="შექმენი პირველი ჯგუფი ზემოთ." />}

      <div className="groups-page__list">
        {groups.map((g: GroupWithJobCount) => (
          <Card key={g.id} className="groups-page__row">
            <div className="groups-page__row-head">
              {g.carNumber !== null && (
                <span className="groups-page__car-badge" aria-hidden="true">
                  🚐 {g.carNumber}
                </span>
              )}
              <strong>{g.name}</strong>
              <span className="groups-page__count">{g.jobCount} სამუშაო</span>
            </div>
            {(g.worker1Name || g.worker2Name) && (
              <p className="groups-page__workers">{[g.worker1Name, g.worker2Name].filter(Boolean).join(", ")}</p>
            )}
            <div className="groups-page__actions">
              <Button onClick={() => setEditTarget(g)}>რედაქტირება</Button>
              <Button onClick={() => setPeriodsTarget(g)}>პერიოდები</Button>
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
