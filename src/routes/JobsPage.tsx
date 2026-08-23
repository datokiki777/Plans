import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SearchInput } from "@/shared/ui/SearchInput";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useToast } from "@/shared/ui/Toast";
import { ShareIconButton } from "@/shared/ui/ShareIconButton";
import { SelectField } from "@/shared/ui/SelectField";
import { useJobs } from "@/features/jobs/useJobs";
import { useJobsFilterStore, type JobsListTab } from "@/features/jobs/useJobsFilterStore";
import { JobForm } from "@/features/jobs/JobForm";
import { JobShareCard } from "@/features/jobs/JobShareCard";
import { useJobShare } from "@/features/jobs/useJobShare";
import { groupRepository, jobRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, findHighlightDate, isJobHighlighted, type Job } from "@/entities/job";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import "./JobsPage.css";

const TABS: Array<{ label: string; value: JobsListTab }> = [
  { label: "ყველა", value: "all" },
  { label: "აქტიური", value: "active" },
  { label: "დაარქივებული", value: "archived" }
];

export default function JobsPage() {
  const tab = useJobsFilterStore((s) => s.tab);
  const groupId = useJobsFilterStore((s) => s.groupId);
  const query = useJobsFilterStore((s) => s.query);
  const setTab = useJobsFilterStore((s) => s.setTab);
  const setGroupId = useJobsFilterStore((s) => s.setGroupId);
  const setQuery = useJobsFilterStore((s) => s.setQuery);

  const [groups, setGroups] = useState<Group[]>([]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const [highlightGroupIds, setHighlightGroupIds] = useState<Set<string>>(new Set());
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { jobs, reload } = useJobs({ tab, groupId: groupId || undefined, query });
  const showToast = useToast();
  const { cardRef, activeJob, sharing, share } = useJobShare();
  const today = useMemo(() => todayDateOnly(), []);

  useEffect(() => {
    groupRepository.list().then(setGroups);
  }, []);

  useEffect(() => {
    // What's "next up" (today's work, or the nearest future date with any
    // active work once today's is done/archived) - computed from every
    // non-archived job, independent of the current filter/tab, so it stays
    // accurate no matter what's currently selected/displayed.
    jobRepository.list({ limit: 300 }).then((allJobs) => {
      const date = findHighlightDate(allJobs, today);
      setHighlightDate(date);
      const ids = new Set(
        allJobs.filter((j) => isJobHighlighted(j, date)).map((j) => j.groupId).filter((id): id is string => id !== null)
      );
      setHighlightGroupIds(ids);
    });
  }, [today, jobs]);

  const handleShare = async (job: Job) => {
    try {
      const outcome = await share(job);
      if (outcome === "shared") showToast("გაზიარება გაიხსნა.", "ok");
      else if (outcome === "downloaded-with-link-copied") showToast("სურათი ჩამოიტვირთა, Maps ლინკი დაკოპირდა — ჩასვი WhatsApp-ში.", "ok");
      else if (outcome === "downloaded-only")
        showToast("სურათი ჩამოიტვირთა. ეს მოწყობილობა/ბრაუზერი პირდაპირ გაზიარებას ვერ უჭერს მხარს.", "warn");
    } catch (error) {
      console.error("Job share failed:", error);
      showToast("გაზიარება ვერ განხორციელდა, სცადე თავიდან.", "warn");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Plans"
        title="სამუშაოები"
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            + სამუშაო
          </Button>
        }
      />

      <div className="jobs-page__group-filter">
        <SelectField
          value={groupId}
          onChange={setGroupId}
          placeholder="ყველა ჯგუფი"
          title="ჯგუფის მიხედვით გაფილტვრა"
          options={groups.map((g) => ({ value: g.id, label: g.name, highlight: highlightGroupIds.has(g.id) }))}
        />
      </div>

      <SearchInput placeholder="მოძებნე სახელით/მისამართით…" onSearch={setQuery} defaultValue={query} />

      {!query && (
        <div className="jobs-page__tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`jobs-page__tab${tab === t.value ? " jobs-page__tab--active" : ""}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {jobs.length === 0 && <EmptyState title="სამუშაო არ მოიძებნა" description="დაამატე პირველი სამუშაო ზემოთა ღილაკით." />}

      <div className="jobs-page__list">
        {jobs.map((job) => (
          <Card key={job.id} className={`jobs-page__row${isJobHighlighted(job, highlightDate) ? " jobs-page__row--today" : ""}`}>
            <Link to={`/jobs/${job.id}`} className="jobs-page__row-link">
              <div className="jobs-page__row-head">
                <strong>{job.clientSnapshot.fullName || "უსახელო სამუშაო"}</strong>
                <StatusBadge label={JOB_STATUS_LABELS[job.status]} tone={JOB_STATUS_TONES[job.status]} />
              </div>
              <div className="jobs-page__row-sub">
                <p className="jobs-page__row-meta">
                  {formatDateOnly(job.jobDate)}
                  {job.jobDurationDays ? ` · ${job.jobDurationDays} დღიანი` : ""}
                </p>
                {job.groupId && groupsById.get(job.groupId) && (
                  <span className="jobs-page__row-group">{groupsById.get(job.groupId)?.name}</span>
                )}
              </div>
            </Link>
            <div className="jobs-page__row-actions">
              <ShareIconButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleShare(job);
                }}
                disabled={sharing}
              />
            </div>
          </Card>
        ))}
      </div>

      <JobForm open={formOpen} onClose={() => setFormOpen(false)} initialGroupId={groupId} onSaved={reload} />

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <JobShareCard ref={cardRef} job={activeJob} />
    </div>
  );
}
