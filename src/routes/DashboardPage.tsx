import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ShareIconButton } from "@/shared/ui/ShareIconButton";
import { GroupPill } from "@/shared/ui/GroupPill";
import { useToast } from "@/shared/ui/Toast";
import { jobRepository, groupRepository, groupPeriodRepository, workerRepository, stayRepository, loadingRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import { JOB_STATUS_LABELS, JOB_STATUS_TONES, computeGroupHighlightDates, isJobRowHighlighted, isJobUpcomingOrOngoing } from "@/entities/job";
import type { Group } from "@/entities/group";
import type { GroupPeriod } from "@/entities/group-period";
import { findPeriodForJob } from "@/entities/group-period";
import { currentPeriodInfo } from "@/entities/stay";
import type { LoadingList } from "@/entities/loading-list";
import { isDatedLoadingList } from "@/entities/loading-list";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import { JobShareCard } from "@/features/jobs/JobShareCard";
import { useJobShare } from "@/features/jobs/useJobShare";
import { LoadingShareCard } from "@/features/loading/LoadingShareCard";
import { useLoadingShare } from "@/features/loading/useLoadingShare";
import "./DashboardPage.css";

interface DashboardData {
  activeCount: number;
  upcomingEntries: DashboardEntry[];
  recent: Job[];
  groupsById: Map<string, Group>;
  periods: GroupPeriod[];
  workersInside: number;
  workersUrgent: number;
  recentLoadingLists: LoadingList[];
  groupHighlightDates: Map<string, string>;
  today: string;
}

type DashboardEntry = { kind: "job"; job: Job } | { kind: "loading"; list: LoadingList };

function LoadingRow({ list, group, onShare, sharing }: { list: LoadingList; group?: Group; onShare: (list: LoadingList) => void; sharing: boolean }) {
  return (
    <Card className="dashboard__row dashboard__row--loading">
      <Link to="/loading" state={{ openListId: list.id }} className="dashboard__row-link">
        <div className="dashboard__row-head">
          <strong>🚚 {list.title}</strong>
          {list.archivedAt && <StatusBadge label="დაარქივებული" tone="danger" />}
        </div>
        <div className="dashboard__row-sub">
          <span className="dashboard__row-meta dashboard__row-meta--loading">{formatDateOnly(list.loadingDate)} · დატვირთვა</span>
          {group && <GroupPill group={group} className="dashboard__row-group" longClassName="dashboard__row-group--long" />}
        </div>
      </Link>
      <ShareIconButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onShare(list);
        }}
        disabled={sharing}
      />
    </Card>
  );
}

function JobRow({
  job,
  group,
  periods,
  onShare,
  sharing,
  groupHighlightDates,
  today
}: {
  job: Job;
  group?: Group;
  periods: GroupPeriod[];
  onShare: (job: Job) => void;
  sharing: boolean;
  groupHighlightDates: Map<string, string>;
  today: string;
}) {
  return (
    <Card
      className={`dashboard__row${
        job.status === "archived" ? " dashboard__row--archived" : isJobRowHighlighted(job, groupHighlightDates, today) ? " dashboard__row--today" : ""
      }`}
    >
      <Link to={`/jobs/${job.id}`} className="dashboard__row-link">
        <div className="dashboard__row-head">
          <strong>{job.clientSnapshot.fullName}</strong>
          <StatusBadge label={JOB_STATUS_LABELS[job.status]} tone={JOB_STATUS_TONES[job.status]} />
        </div>
        <div className="dashboard__row-sub">
          {job.jobDate && (
            <span className="dashboard__row-meta">
              {formatDateOnly(job.jobDate)}
              {job.jobDurationDays ? ` · ${job.jobDurationDays} დღიანი` : ""}
            </span>
          )}
          {group && (
            <GroupPill group={group} periodOverride={findPeriodForJob(job, periods)} className="dashboard__row-group" longClassName="dashboard__row-group--long" />
          )}
        </div>
      </Link>
      <ShareIconButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onShare(job);
        }}
        disabled={sharing}
      />
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const showToast = useToast();
  const { cardRef, activeJob, sharing, share } = useJobShare();
  const { cardRef: loadingCardRef, activeList, activeItems, sharing: loadingSharing, share: shareLoading } = useLoadingShare();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [activeCount, activeJobs, recent, allJobsForHighlight, groups, periods, workers, recentLoadingLists] = await Promise.all([
        jobRepository.list({ status: "active" }).then((r) => r.length),
        jobRepository.list({ status: "active", limit: 50 }),
        jobRepository.list({ limit: 5 }),
        jobRepository.list({ limit: 300 }),
        groupRepository.list({ includeArchived: true }),
        groupPeriodRepository.listAll(),
        workerRepository.list(),
        loadingRepository.listLists({ includeArchived: false })
      ]);

      const today = todayDateOnly();
      const upcomingJobs = activeJobs.filter((j) => isJobUpcomingOrOngoing(j, today));
      const upcomingLoadingLists = recentLoadingLists.filter((l) => isDatedLoadingList(l) && (l.loadingDate as string) >= today);
      const upcomingEntries: DashboardEntry[] = [
        ...upcomingJobs.map((job): DashboardEntry => ({ kind: "job", job })),
        ...upcomingLoadingLists.map((list): DashboardEntry => ({ kind: "loading", list }))
      ]
        .sort((a, b) => {
          const dateA = a.kind === "job" ? (a.job.jobDate ?? "") : (a.list.loadingDate ?? "");
          const dateB = b.kind === "job" ? (b.job.jobDate ?? "") : (b.list.loadingDate ?? "");
          return dateA.localeCompare(dateB);
        })
        .slice(0, 5);
      const groupHighlightDates = computeGroupHighlightDates(allJobsForHighlight, today);

      const workerInfos = await Promise.all(
        workers.map(async (w) => currentPeriodInfo(await stayRepository.listByWorker(w.id)))
      );
      const workersInside = workerInfos.filter((i) => i.inside).length;
      const workersUrgent = workerInfos.filter((i) => i.inside && (i.remainingDays ?? 99) <= 14).length;

      if (!cancelled) {
        setData({
          activeCount,
          upcomingEntries,
          recent,
          groupsById: new Map(groups.map((g) => [g.id, g])),
          periods,
          workersInside,
          workersUrgent,
          recentLoadingLists: recentLoadingLists.slice(0, 3),
          groupHighlightDates,
          today
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

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

  const handleShareLoading = async (list: LoadingList) => {
    try {
      const outcome = await shareLoading(list);
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
      <PageHeader eyebrow="Plans" title="მთავარი" />

      <div className="dashboard__stats">
        <Card className="dashboard__stat">
          <span>აქტიური სამუშაო</span>
          <strong>{data.activeCount}</strong>
        </Card>
        <Card className="dashboard__stat">
          <span>ქვეყანაში (მუშები)</span>
          <strong>{data.workersInside}</strong>
        </Card>
        <Card className="dashboard__stat dashboard__stat--warn">
          <span>გასვლა ≤ 14 დღე</span>
          <strong>{data.workersUrgent}</strong>
        </Card>
      </div>

      <section className="dashboard__section">
        <h2>მოახლოებული სამუშაოები</h2>
        {data.upcomingEntries.length === 0 ? (
          <EmptyState title="მოახლოებული სამუშაო არ არის" />
        ) : (
          <div className="dashboard__list">
            {data.upcomingEntries.map((entry) =>
              entry.kind === "loading" ? (
                <LoadingRow
                  key={`loading-${entry.list.id}`}
                  list={entry.list}
                  group={entry.list.groupId ? data.groupsById.get(entry.list.groupId) : undefined}
                  onShare={handleShareLoading}
                  sharing={loadingSharing}
                />
              ) : (
                <JobRow
                  key={entry.job.id}
                  job={entry.job}
                  group={entry.job.groupId ? data.groupsById.get(entry.job.groupId) : undefined}
                  periods={data.periods}
                  onShare={handleShare}
                  sharing={sharing}
                  groupHighlightDates={data.groupHighlightDates}
                  today={data.today}
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="dashboard__section">
        <h2>ბოლოს ცვლილი სამუშაოები</h2>
        <div className="dashboard__list">
          {data.recent.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              group={job.groupId ? data.groupsById.get(job.groupId) : undefined}
              periods={data.periods}
              onShare={handleShare}
              sharing={sharing}
              groupHighlightDates={data.groupHighlightDates}
              today={data.today}
            />
          ))}
        </div>
      </section>

      <section className="dashboard__section">
        <h2>დატვირთვის სიები</h2>
        {data.recentLoadingLists.length === 0 ? (
          <EmptyState title="სია არ არის" />
        ) : (
          <div className="dashboard__list">
            {data.recentLoadingLists.map((list) => (
              <Link key={list.id} to="/loading" className="dashboard__row">
                <Card>{list.title}</Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <JobShareCard ref={cardRef} job={activeJob} />
      <LoadingShareCard ref={loadingCardRef} title={activeList?.title ?? ""} items={activeItems} specialNote={activeList?.specialNote} />
    </div>
  );
}
