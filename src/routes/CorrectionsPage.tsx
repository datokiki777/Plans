import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";
import { jobRepository, correctionRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import { CORRECTION_STATUS_LABELS, type Correction } from "@/entities/correction";
import { formatDateOnly } from "@/shared/lib/date";
import { CorrectionDialog } from "@/features/corrections/CorrectionDialog";
import "./CorrectionsPage.css";

export default function CorrectionsPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [editTarget, setEditTarget] = useState<Correction | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    correctionRepository.listByJob(id).then(setCorrections);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    jobRepository.getById(id).then((found) => setJob(found ?? null));
    reload();
  }, [id, reload]);

  const handleAdd = async () => {
    if (!id) return;
    const created = await correctionRepository.create({ jobId: id });
    reload();
    setEditTarget(created);
  };

  if (job === undefined) return null;
  if (job === null || !id) {
    return <EmptyState title="სამუშაო ვერ მოიძებნა" description="შესაძლოა წაშლილია." />;
  }

  return (
    <div>
      <PageHeader
        eyebrow={job.clientSnapshot.fullName || "უსახელო სამუშაო"}
        title="გამოსასწორებელი"
        actions={
          <Button variant="primary" onClick={() => void handleAdd()}>
            + ახალი
          </Button>
        }
      />

      <Link to={`/jobs/${id}`} className="corrections-page__back-link">
        ← უკან სამუშაოზე
      </Link>

      {corrections.length === 0 && <EmptyState title="გამოსასწორებელი ჯერ არ არის" description="დაამატე პირველი ზემოთა ღილაკით." />}

      <div className="corrections-page__list">
        {corrections.map((c) => (
          <Card
            key={c.id}
            className={`corrections-page__row corrections-page__row--${c.status}`}
            onClick={() => setEditTarget(c)}
          >
            <div className="corrections-page__row-head">
              <span className="corrections-page__status-badge">{CORRECTION_STATUS_LABELS[c.status]}</span>
              {c.resolvedDate && <span className="corrections-page__date">{formatDateOnly(c.resolvedDate)}</span>}
            </div>
            <p className="corrections-page__comment">{c.comment || "კომენტარის გარეშე"}</p>
          </Card>
        ))}
      </div>

      <CorrectionDialog correction={editTarget} onClose={() => setEditTarget(null)} onChanged={reload} />
    </div>
  );
}
