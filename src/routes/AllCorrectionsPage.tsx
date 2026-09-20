import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { correctionRepository, jobRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
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
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    correctionRepository.listAll().then(setCorrections);
    jobRepository.list({ limit: 1000 }).then((jobs) => setJobsById(new Map(jobs.map((j) => [j.id, j]))));
  }, []);

  const filtered = useMemo(() => (tab === "all" ? corrections : corrections.filter((c) => c.status === tab)), [corrections, tab]);

  return (
    <div>
      <PageHeader eyebrow="Plans" title="გამოსასწორებლები" />

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
          return (
            <Link key={c.id} to={`/jobs/${c.jobId}/corrections`} className="all-corrections-page__row-link">
              <Card className={`all-corrections-page__row all-corrections-page__row--${c.status}`}>
                <div className="all-corrections-page__row-head">
                  <strong>{job?.clientSnapshot.fullName || "უსახელო სამუშაო"}</strong>
                  <span className="all-corrections-page__status">{CORRECTION_STATUS_LABELS[c.status]}</span>
                </div>
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
