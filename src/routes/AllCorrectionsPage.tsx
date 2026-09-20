import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SelectField } from "@/shared/ui/SelectField";
import { GroupPill } from "@/shared/ui/GroupPill";
import { correctionRepository, jobRepository, groupRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import type { Group } from "@/entities/group";
import { formatGroupLabel } from "@/entities/group";
import { CORRECTION_STATUS_LABELS, type Correction, type CorrectionStatus } from "@/entities/correction";
import { formatDateOnly } from "@/shared/lib/date";
import "./AllCorrectionsPage.css";

type Tab = "all" | CorrectionStatus;

const TABS: Array<{ label: string; value: Tab }> = [
  { label: "ყველა", value: "all" },
  { label: "გასასწორებელი", value: "pending" },
  { label: "გასწორებული", value: "fixed" },
  { label: "არ ჩაითვალა", value: "not-applicable" }
];

export default function AllCorrectionsPage() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [jobsById, setJobsById] = useState<Map<string, Job>>(new Map());
  const [groups, setGroups] = useState<Group[]>([]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const [tab, setTab] = useState<Tab>("all");
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    correctionRepository.listAll().then(setCorrections);
    jobRepository.list({ limit: 1000 }).then((jobs) => setJobsById(new Map(jobs.map((j) => [j.id, j]))));
    groupRepository.list().then(setGroups);
  }, []);

  // A correction has no group of its own - it's shown/filtered by its
  // job's group, the same one that job's own card already shows.
  const filtered = useMemo(
    () =>
      corrections.filter((c) => {
        if (tab !== "all" && c.status !== tab) return false;
        if (groupId && jobsById.get(c.jobId)?.groupId !== groupId) return false;
        return true;
      }),
    [corrections, tab, groupId, jobsById]
  );

  return (
    <div>
      <PageHeader eyebrow="Plans" title="გამოსასწორებლები" />

      <SelectField
        value={groupId}
        onChange={setGroupId}
        placeholder="ყველა ჯგუფი"
        title="ჯგუფის მიხედვით გაფილტვრა"
        options={groups.map((g) => ({ value: g.id, label: formatGroupLabel(g) }))}
      />

      <div className="all-corrections-page__tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`all-corrections-page__tab${tab === t.value ? " all-corrections-page__tab--active" : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState title="გამოსასწორებელი არ მოიძებნა" />}

      <div className="all-corrections-page__list">
        {filtered.map((c) => {
          const job = jobsById.get(c.jobId);
          const group = job?.groupId ? groupsById.get(job.groupId) : undefined;
          return (
            <Link key={c.id} to={`/jobs/${c.jobId}/corrections`} className="all-corrections-page__row-link">
              <Card className={`all-corrections-page__row all-corrections-page__row--${c.status}`}>
                <div className="all-corrections-page__row-head">
                  <strong>{job?.clientSnapshot.fullName || "უსახელო სამუშაო"}</strong>
                  <span className="all-corrections-page__status">{CORRECTION_STATUS_LABELS[c.status]}</span>
                </div>
                {group && (
                  <GroupPill
                    group={group}
                    className="all-corrections-page__group"
                    longClassName="all-corrections-page__group--long"
                  />
                )}
                <p className="all-corrections-page__comment">{c.comment || "კომენტარის გარეშე"}</p>
                {c.resolvedDate && <span className="all-corrections-page__date">{formatDateOnly(c.resolvedDate)}</span>}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
