import { useEffect, useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import { FormField, Input } from "@/shared/ui/fields";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { groupPeriodRepository, jobRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import type { GroupPeriod } from "@/entities/group-period";
import { jobOverlapsPeriod } from "@/entities/group-period";
import type { Job } from "@/entities/job";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import "./GroupPeriodsDialog.css";

export interface GroupPeriodsDialogProps {
  group: Group | null;
  onClose: () => void;
}

/** Manages a group's planned work periods (complete date ranges, entered
 * up front - unlike a worker's entry/exit-later Stay). Add, edit, and
 * delete inline - no separate "history" vs "add" split like the Workers
 * page, since a period's dates are both known at once.
 *
 * Jobs are never manually attached to a period - a job already has its
 * own group + date + duration, so which period it falls into is worked
 * out automatically by date overlap and shown under each period here, so
 * it's clear at a glance rather than requiring a second data-entry step. */
export function GroupPeriodsDialog({ group, onClose }: GroupPeriodsDialogProps) {
  const [periods, setPeriods] = useState<GroupPeriod[]>([]);
  const [groupJobs, setGroupJobs] = useState<Job[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState(todayDateOnly());
  const [draftEnd, setDraftEnd] = useState(todayDateOnly());
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
    setDraftStart(todayDateOnly());
    setDraftEnd(todayDateOnly());
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (period: GroupPeriod) => {
    setDraftStart(period.startDate);
    setDraftEnd(period.endDate);
    setEditingId(period.id);
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
  };

  const saveNew = async () => {
    if (!draftStart || !draftEnd) return;
    if (draftEnd < draftStart) {
      showToast("დასრულების თარიღი დაწყების თარიღზე ადრე ვერ იქნება.", "warn");
      return;
    }
    await groupPeriodRepository.create({ groupId: group.id, startDate: draftStart, endDate: draftEnd });
    setAdding(false);
    await reload(group.id);
    showToast("პერიოდი დაემატა.", "ok");
  };

  const saveEdit = async (id: string) => {
    if (!draftStart || !draftEnd) return;
    if (draftEnd < draftStart) {
      showToast("დასრულების თარიღი დაწყების თარიღზე ადრე ვერ იქნება.", "warn");
      return;
    }
    await groupPeriodRepository.update(id, { startDate: draftStart, endDate: draftEnd });
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

  return (
    <Dialog open={group !== null} onClose={onClose} title={`პერიოდები - ${group.name}`}>
      <div className="group-periods">
        <p className="group-periods__hint">
          სამუშაოები ავტომატურად ჩნდება შესაბამის პერიოდში - საკმარისია სამუშაოს ფორმაში ეს ჯგუფი და თარიღი აირჩიო, ხელით მიბმა არ სჭირდება.
        </p>
        {periods.length === 0 && !adding && <p className="group-periods__empty">პერიოდი ჯერ არ არის დამატებული.</p>}

        {periods.map((period) =>
          editingId === period.id ? (
            <div key={period.id} className="group-periods__row group-periods__row--editing">
              <FormField label="დაწყება">
                <Input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
              </FormField>
              <FormField label="დასრულება">
                <Input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
              </FormField>
              <div className="group-periods__row-actions">
                <Button onClick={cancelEdit}>გაუქმება</Button>
                <Button variant="primary" onClick={() => void saveEdit(period.id)}>
                  შენახვა
                </Button>
              </div>
            </div>
          ) : (
            <div key={period.id} className="group-periods__row">
              <div className="group-periods__row-head">
                <span className="group-periods__range">
                  {formatDateOnly(period.startDate)} — {formatDateOnly(period.endDate)}
                </span>
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
                const linkedJobs = groupJobs.filter((j) => jobOverlapsPeriod(j, period));
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

        {adding && (
          <div className="group-periods__row group-periods__row--editing">
            <FormField label="დაწყება">
              <Input type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
            </FormField>
            <FormField label="დასრულება">
              <Input type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
            </FormField>
            <div className="group-periods__row-actions">
              <Button onClick={cancelEdit}>გაუქმება</Button>
              <Button variant="primary" onClick={() => void saveNew()}>
                შენახვა
              </Button>
            </div>
          </div>
        )}

        {!adding && editingId === null && <Button onClick={startAdd}>+ პერიოდის დამატება</Button>}
      </div>
    </Dialog>
  );
}
