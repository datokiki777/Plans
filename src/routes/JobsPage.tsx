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
import { GroupPill } from "@/shared/ui/GroupPill";
import { useJobs } from "@/features/jobs/useJobs";
import { useJobsFilterStore, type JobsListTab } from "@/features/jobs/useJobsFilterStore";
import { JobForm } from "@/features/jobs/JobForm";
import { JobShareCard } from "@/features/jobs/JobShareCard";
import { useJobShare } from "@/features/jobs/useJobShare";
import { groupRepository, groupPeriodRepository, jobRepository, loadingRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import { formatGroupLabel } from "@/entities/group";
import type { GroupPeriod } from "@/entities/group-period";
import { findPeriodForJob, isPeriodActiveToday, jobOverlapsPeriod } from "@/entities/group-period";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, computeGroupHighlightDates, isJobRowHighlighted, type Job } from "@/entities/job";
import type { LoadingList } from "@/entities/loading-list";
import { isDatedLoadingList, loadingListMatchesTab, loadingListMatchesGroup, loadingListMatchesQuery } from "@/entities/loading-list";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import "./JobsPage.css";

const TABS: Array<{ label: string; value: JobsListTab }> = [
  { label: "ყველა", value: "all" },
  { label: "აქტიური", value: "active" },
  { label: "დაარქივებული", value: "archived" }
];

type JobsPageEntry =
  | { kind: "job"; job: Job; sortDate: string; archived: boolean }
  | { kind: "loading"; list: LoadingList; sortDate: string; archived: boolean };

export default function JobsPage() {
  const tab = useJobsFilterStore((s) => s.tab);
  const groupId = useJobsFilterStore((s) => s.groupId);
  const query = useJobsFilterStore((s) => s.query);
  const setTab = useJobsFilterStore((s) => s.setTab);
  const setGroupId = useJobsFilterStore((s) => s.setGroupId);
  const setQuery = useJobsFilterStore((s) => s.setQuery);

  const [groups, setGroups] = useState<Group[]>([]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const [periods, setPeriods] = useState<GroupPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const periodsForSelectedGroup = useMemo(() => periods.filter((p) => p.groupId === groupId), [periods, groupId]);
  const selectedPeriod = periodsForSelectedGroup.find((p) => p.id === periodId);
  const [groupHighlightDates, setGroupHighlightDates] = useState<Map<string, string>>(new Map());
  const [formOpen, setFormOpen] = useState(false);
  const [allLoadingLists, setAllLoadingLists] = useState<LoadingList[]>([]);
  const { jobs: jobsBeforePeriodFilter, reload } = useJobs({ tab, groupId: groupId || undefined, query });
  // The period picker is a further, purely date-based narrowing on top of
  // whatever the tab/group/search already produced - a job's status
  // (active/archived) never affects whether it belongs to a period.
  const jobs = selectedPeriod ? jobsBeforePeriodFilter.filter((j) => jobOverlapsPeriod(j, selectedPeriod)) : jobsBeforePeriodFilter;
  const showToast = useToast();
  const { cardRef, activeJob, sharing, share } = useJobShare();
  const today = useMemo(() => todayDateOnly(), []);

  useEffect(() => {
    groupRepository.list().then(setGroups);
    groupPeriodRepository.listAll().then(setPeriods);
  }, []);

  // A period only makes sense for the group it belongs to - if the group
  // selection changes (including clearing it back to "ყველა ჯგუფი"), any
  // previously-selected period no longer applies.
  useEffect(() => {
    setPeriodId("");
  }, [groupId]);

  useEffect(() => {
    // Each group finds its own "next up" date independently - one group
    // having work today must not block a different group's own upcoming
    // day. Computed from every job, independent of the current filter/
    // tab, so it stays accurate no matter what's currently displayed.
    jobRepository.list({ limit: 300 }).then((allJobs) => {
      setGroupHighlightDates(computeGroupHighlightDates(allJobs, today));
    });
  }, [today, jobs]);

  useEffect(() => {
    // Loading the car is real work too - a loading list with a date set
    // shows up here alongside jobs. Re-fetched whenever the job list
    // reloads, so a newly-dated list appears without a full page refresh.
    loadingRepository.listLists({ includeArchived: true }).then(setAllLoadingLists);
  }, [jobs]);

  const relevantLoadingLists = useMemo(
    () =>
      allLoadingLists.filter(
        (l) =>
          isDatedLoadingList(l) &&
          loadingListMatchesTab(l, tab) &&
          loadingListMatchesGroup(l, groupId || undefined) &&
          loadingListMatchesQuery(l, query) &&
          (!selectedPeriod || jobOverlapsPeriod({ jobDate: l.loadingDate, jobDurationDays: 1 }, selectedPeriod))
      ),
    [allLoadingLists, tab, groupId, query, selectedPeriod]
  );

  // Same "active block, then archived block" separation the Jobs page has
  // always used for the "ყველა" tab - a loading-list entry joins whichever
  // block matches its own archived state, sorted together with the jobs
  // in that block by date. For the active-only or archived-only tabs, one
  // of the two blocks is naturally empty.
  const entries: JobsPageEntry[] = useMemo(() => {
    const jobEntries: JobsPageEntry[] = jobs.map((job) => ({
      kind: "job",
      job,
      sortDate: job.jobDate ?? "",
      archived: job.status === "archived"
    }));
    const loadingEntries: JobsPageEntry[] = relevantLoadingLists.map((list) => ({
      kind: "loading",
      list,
      sortDate: list.loadingDate ?? "",
      archived: list.archivedAt !== null
    }));
    const byDateAsc = (a: JobsPageEntry, b: JobsPageEntry) => a.sortDate.localeCompare(b.sortDate);
    const active = [...jobEntries, ...loadingEntries].filter((e) => !e.archived).sort(byDateAsc);
    const archived = [...jobEntries, ...loadingEntries].filter((e) => e.archived).sort(byDateAsc);
    return [...active, ...archived];
  }, [jobs, relevantLoadingLists]);

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
          options={groups.map((g) => ({ value: g.id, label: formatGroupLabel(g), highlight: groupHighlightDates.has(g.id) }))}
        />
        <SelectField
          value={periodId}
          onChange={setPeriodId}
          placeholder="ყველა პერიოდი"
          title="პერიოდის მიხედვით გაფილტვრა"
          disabled={!groupId}
          options={periodsForSelectedGroup.map((p) => ({
            value: p.id,
            label: `${formatDateOnly(p.startDate)} — ${formatDateOnly(p.endDate)}`,
            highlight: isPeriodActiveToday(p, today)
          }))}
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

      {entries.length === 0 && <EmptyState title="სამუშაო არ მოიძებნა" description="დაამატე პირველი სამუშაო ზემოთა ღილაკით." />}

      <div className="jobs-page__list">
        {entries.map((entry) =>
          entry.kind === "loading" ? (
            <Link key={`loading-${entry.list.id}`} to="/loading" state={{ openListId: entry.list.id }} className="jobs-page__row-link-wrapper">
              <Card className="jobs-page__row jobs-page__row--loading">
                <div className="jobs-page__row-head">
                  <strong>🚚 {entry.list.title}</strong>
                  {entry.list.archivedAt && <StatusBadge label="დაარქივებული" tone="danger" />}
                </div>
                <div className="jobs-page__row-sub">
                  <p className="jobs-page__row-meta jobs-page__row-meta--loading">{formatDateOnly(entry.list.loadingDate)} · დატვირთვა</p>
                  {entry.list.groupId && groupsById.get(entry.list.groupId) && (
                    <GroupPill
                      group={groupsById.get(entry.list.groupId)!}
                      className="jobs-page__row-group"
                      longClassName="jobs-page__row-group--long"
                    />
                  )}
                </div>
              </Card>
            </Link>
          ) : (
            <Card
              key={entry.job.id}
              className={`jobs-page__row${
                entry.job.status === "archived"
                  ? " jobs-page__row--archived"
                  : isJobRowHighlighted(entry.job, groupHighlightDates, today)
                    ? " jobs-page__row--today"
                    : ""
              }`}
            >
              <Link to={`/jobs/${entry.job.id}`} className="jobs-page__row-link">
                <div className="jobs-page__row-head">
                  <strong>{entry.job.clientSnapshot.fullName || "უსახელო სამუშაო"}</strong>
                  <StatusBadge label={JOB_STATUS_LABELS[entry.job.status]} tone={JOB_STATUS_TONES[entry.job.status]} />
                </div>
                <div className="jobs-page__row-sub">
                  <p className="jobs-page__row-meta">
                    {formatDateOnly(entry.job.jobDate)}
                    {entry.job.jobDurationDays ? ` · ${entry.job.jobDurationDays} დღიანი` : ""}
                  </p>
                  {entry.job.groupId && groupsById.get(entry.job.groupId) && (
                    <GroupPill
                      group={groupsById.get(entry.job.groupId)!}
                      periodOverride={findPeriodForJob(entry.job, periods)}
                      className="jobs-page__row-group"
                      longClassName="jobs-page__row-group--long"
                    />
                  )}
                </div>
              </Link>
              <div className="jobs-page__row-actions">
                <ShareIconButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleShare(entry.job);
                  }}
                  disabled={sharing}
                />
              </div>
            </Card>
          )
        )}
      </div>

      <JobForm open={formOpen} onClose={() => setFormOpen(false)} initialGroupId={groupId} onSaved={reload} />

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <JobShareCard ref={cardRef} job={activeJob} />
    </div>
  );
}
