import { useEffect, useState } from "react";
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
import { useJobsFilterStore } from "@/features/jobs/useJobsFilterStore";
import { JobForm } from "@/features/jobs/JobForm";
import { JobShareCard } from "@/features/jobs/JobShareCard";
import { useJobShare } from "@/features/jobs/useJobShare";
import { groupRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, type Job, type JobStatus } from "@/entities/job";
import { formatDateOnly } from "@/shared/lib/date";
import "./JobsPage.css";

const STATUS_TABS: Array<{ label: string; value: JobStatus | "" }> = [
  { label: "ყველა აქტიური", value: "" },
  { label: JOB_STATUS_LABELS.planned, value: "planned" },
  { label: JOB_STATUS_LABELS.active, value: "active" },
  { label: JOB_STATUS_LABELS.completed, value: "completed" },
  { label: JOB_STATUS_LABELS.archived, value: "archived" }
];

export default function JobsPage() {
  const status = useJobsFilterStore((s) => s.status);
  const groupId = useJobsFilterStore((s) => s.groupId);
  const query = useJobsFilterStore((s) => s.query);
  const setStatus = useJobsFilterStore((s) => s.setStatus);
  const setGroupId = useJobsFilterStore((s) => s.setGroupId);
  const setQuery = useJobsFilterStore((s) => s.setQuery);

  const [groups, setGroups] = useState<Group[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const { jobs, reload } = useJobs({ status: status || undefined, groupId: groupId || undefined, query });
  const showToast = useToast();
  const { cardRef, activeJob, activeGroupName, sharing, share } = useJobShare();

  useEffect(() => {
    groupRepository.list().then(setGroups);
  }, []);

  const handleShare = async (job: Job) => {
    try {
      const groupName = groups.find((g) => g.id === job.groupId)?.name ?? null;
      const outcome = await share(job, groupName);
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

      <SearchInput placeholder="მოძებნე კლიენტის სახელით/მისამართით…" onSearch={setQuery} defaultValue={query} />

      {!query && (
        <div className="jobs-page__tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`jobs-page__tab${status === tab.value ? " jobs-page__tab--active" : ""}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="jobs-page__group-filter">
        <SelectField
          value={groupId}
          onChange={setGroupId}
          placeholder="ყველა ჯგუფი"
          title="ჯგუფის მიხედვით გაფილტვრა"
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
        />
      </div>

      {jobs.length === 0 && <EmptyState title="სამუშაო არ მოიძებნა" description="დაამატე პირველი სამუშაო ზემოთა ღილაკით." />}

      <div className="jobs-page__list">
        {jobs.map((job) => (
          <Card key={job.id} className="jobs-page__row">
            <Link to={`/jobs/${job.id}`} className="jobs-page__row-link">
              <div className="jobs-page__row-head">
                <strong>{job.clientSnapshot.fullName || "უსახელო კლიენტი"}</strong>
                <StatusBadge label={JOB_STATUS_LABELS[job.status]} tone={JOB_STATUS_TONES[job.status]} />
              </div>
              <p className="jobs-page__row-meta">
                {formatDateOnly(job.jobDate)}
                {job.jobDurationDays ? ` · ${job.jobDurationDays} დღიანი` : ""}
              </p>
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

      <JobForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} />

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <JobShareCard ref={cardRef} job={activeJob} groupName={activeGroupName} />
    </div>
  );
}
