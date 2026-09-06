import { useEffect, useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import { FormField, Input } from "@/shared/ui/fields";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { groupPeriodRepository, jobRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import { formatGroupLabel } from "@/entities/group";
import type { GroupPeriod } from "@/entities/group-period";
import { jobOverlapsPeriod } from "@/entities/group-period";
import type { Job } from "@/entities/job";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import "./GroupPeriodsDialog.css";

export interface GroupPeriodsDialogProps {
  group: Group | null;
  onClose: () => void;
}

interface PeriodDraft {
  startDate: string;
  endDate: string;
  carNumber: string;
  worker1Name: string;
  worker2Name: string;
}

function emptyDraft(): PeriodDraft {
  const today = todayDateOnly();
  return { startDate: today, endDate: today, carNumber: "", worker1Name: "", worker2Name: "" };
}

/** Manages a group's planned work periods (complete date ranges, entered
 * up front - unlike a worker's entry/exit-later Stay). Add, edit, and
 * delete inline - no separate "history" vs "add" split like the Workers
 * page, since a period's dates are both known at once.
 *
 * Each period stores its OWN car number and worker names, pre-filled from
 * the group's current values when starting a new one but independent
 * afterward - reassigning the group's car going forward must not silently
 * rewrite which car an already-recorded period used.
 *
 * Jobs are never manually attached to a period - a job already has its
 * own group + date + duration, so which period it falls into is worked
 * out automatically by date overlap and shown under each period here, so
 * it's clear at a glance rather than requiring a second data-entry step. */
export function GroupPeriodsDialog({ group, onClose }: GroupPeriodsDialogProps) {
  const [periods, setPeriods] = useState<GroupPeriod[]>([]);
  const [groupJobs, setGroupJobs] = useState<Job[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PeriodDraft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const showToast = useToast();
  const confirm = useConfirm();

  const reload = async (groupId: string) => {
    const [periodList, jobList] = await Promise.all([groupPeriodRepository.listByGroup(groupId), jobRepository.listByGroup(groupId)]);
    setPeriods(periodList);
    setGroupJobs(jobList);
  };

  useEffect(() => {
    if (group) void reload(group.id);
    setEditingId(null);
    setAdding(false);
  }, [group]);

  if (!group) return null;

  const startAdd = () => {
    // Pre-fill from the group's CURRENT car/workers - a sensible default
    // for a new period, but stored as this period's own copy from here on.
    setDraft({
      startDate: todayDateOnly(),
      endDate: todayDateOnly(),
      carNumber: group.carNumber !== null ? String(group.carNumber) : "",
      worker1Name: group.worker1Name,
      worker2Name: group.worker2Name
    });
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (period: GroupPeriod) => {
    setDraft({
      startDate: period.startDate,
      endDate: period.endDate,
      carNumber: period.carNumber !== null ? String(period.carNumber) : "",
      worker1Name: period.worker1Name,
      worker2Name: period.worker2Name
    });
    setEditingId(period.id);
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
  };

  const buildPayload = () => ({
    startDate: draft.startDate,
    endDate: draft.endDate,
    carNumber: draft.carNumber.trim() ? Number(draft.carNumber) : null,
    worker1Name: draft.worker1Name.trim(),
    worker2Name: draft.worker2Name.trim()
  });

  const saveNew = async () => {
    if (!draft.startDate || !draft.endDate) return;
    if (draft.endDate < draft.startDate) {
      showToast("დასრულების თარიღი დაწყების თარიღზე ადრე ვერ იქნება.", "warn");
      return;
    }
    await groupPeriodRepository.create({ groupId: group.id, ...buildPayload() });
    setAdding(false);
    await reload(group.id);
    showToast("პერიოდი დაემატა.", "ok");
  };

  const saveEdit = async (id: string) => {
    if (!draft.startDate || !draft.endDate) return;
    if (draft.endDate < draft.startDate) {
      showToast("დასრულების თარიღი დაწყების თარიღზე ადრე ვერ იქნება.", "warn");
      return;
    }
    await groupPeriodRepository.update(id, buildPayload());
    setEditingId(null);
    await reload(group.id);
    showToast("პერიოდი განახლდა.", "ok");
  };

  const handleDelete = async (period: GroupPeriod) => {
    const ok = await confirm({
      title: "პერიოდის წაშლა",
      message: `${formatDateOnly(period.startDate)} - ${formatDateOnly(period.endDate)} პერიოდი წაიშლება. გავაგრძელოთ?`,
      danger: true
    });
    if (!ok) return;
    await groupPeriodRepository.delete(period.id);
    await reload(group.id);
  };

  const editForm = (onCancel: () => void, onSave: () => void) => (
    <div className="group-periods__row group-periods__row--editing">
      <div className="group-periods__date-pair">
        <FormField label="დაწყება">
          <Input type="date" value={draft.startDate} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} />
        </FormField>
        <FormField label="დასრულება">
          <Input type="date" value={draft.endDate} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="მანქანის ნომერი" hint="არასავალდებულო">
        <Input type="number" inputMode="numeric" value={draft.carNumber} onChange={(e) => setDraft((d) => ({ ...d, carNumber: e.target.value }))} />
      </FormField>
      <FormField label="მუშა 1" hint="არასავალდებულო">
        <Input value={draft.worker1Name} onChange={(e) => setDraft((d) => ({ ...d, worker1Name: e.target.value }))} />
      </FormField>
      <FormField label="მუშა 2" hint="არასავალდებულო">
        <Input value={draft.worker2Name} onChange={(e) => setDraft((d) => ({ ...d, worker2Name: e.target.value }))} />
      </FormField>
      <div className="group-periods__row-actions">
        <Button onClick={onCancel}>გაუქმება</Button>
        <Button variant="primary" onClick={onSave}>
          შენახვა
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={group !== null} onClose={onClose} title={`პერიოდები - ${formatGroupLabel(group)}`}>
      <div className="group-periods">
        <p className="group-periods__hint">
          სამუშაოები ავტომატურად ჩნდება შესაბამის პერიოდში - საკმარისია სამუშაოს ფორმაში ეს ჯგუფი და თარიღი აირჩიო, ხელით მიბმა არ სჭირდება.
          მანქანისა და მუშების ინფორმაცია თითოეულ პერიოდს თავისი აქვს დამახსოვრებული - მომავალში მანქანის შეცვლა ძველ პერიოდებს არ შეცვლის.
        </p>
        {periods.length === 0 && !adding && <p className="group-periods__empty">პერიოდი ჯერ არ არის დამატებული.</p>}

        <div className="group-periods__list">
          {periods.map((period) =>
            editingId === period.id ? (
              <div key={period.id}>{editForm(cancelEdit, () => void saveEdit(period.id))}</div>
            ) : (
              <div key={period.id} className="group-periods__row">
                <div className="group-periods__row-head">
                  <div>
                    <span className="group-periods__range">
                      {formatDateOnly(period.startDate)} — {formatDateOnly(period.endDate)}
                    </span>
                    {(period.carNumber !== null || period.worker1Name || period.worker2Name) && (
                      <p className="group-periods__period-details">{formatGroupLabel(group, period)}</p>
                    )}
                  </div>
                  <div className="group-periods__row-actions">
                    <IconButton label="რედაქტირება" onClick={() => startEdit(period)}>
                      ✎
                    </IconButton>
                    <IconButton label="წაშლა" onClick={() => void handleDelete(period)}>
                      ×
                    </IconButton>
                  </div>
                </div>
                {(() => {
                  const linkedJobs = groupJobs
                    .filter((j) => jobOverlapsPeriod(j, period))
                    .sort((a, b) => (b.jobDate ?? "").localeCompare(a.jobDate ?? ""));
                  return linkedJobs.length > 0 ? (
                    <ul className="group-periods__jobs">
                      {linkedJobs.map((j) => (
                        <li key={j.id}>
                          {j.clientSnapshot.fullName || "უსახელო სამუშაო"}
                          {j.jobDate ? ` (${formatDateOnly(j.jobDate)})` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="group-periods__jobs-empty">ამ პერიოდში სამუშაო არ ჩანს.</p>
                  );
                })()}
              </div>
            )
          )}
        </div>

        {adding && editForm(cancelEdit, () => void saveNew())}

        {!adding && editingId === null && <Button onClick={startAdd}>+ პერიოდის დამატება</Button>}
      </div>
    </Dialog>
  );
}
