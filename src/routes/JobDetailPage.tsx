import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { StatusToggle } from "@/shared/ui/StatusToggle";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { jobRepository, groupRepository } from "@/db/repositories";
import type { Job } from "@/entities/job";
import type { Group } from "@/entities/group";
import { formatDateOnly } from "@/shared/lib/date";
import { JobForm } from "@/features/jobs/JobForm";
import { JobShareCard } from "@/features/jobs/JobShareCard";
import { useJobShare } from "@/features/jobs/useJobShare";
import { ShareIconButton } from "@/shared/ui/ShareIconButton";
import "./JobDetailPage.css";

function DetailRow({ label, value, highlight }: { label: string; value?: string | string[] | null; highlight?: boolean }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="job-detail__row">
      <span className="job-detail__row-label">{label}</span>
      {Array.isArray(value) ? (
        <ul className="job-detail__row-list">
          {value.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      ) : (
        <p className={`job-detail__row-value${highlight ? " job-detail__row-value--highlight" : ""}`}>{value}</p>
      )}
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [group, setGroup] = useState<Group | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    jobRepository.getById(id).then((found) => {
      setJob(found ?? null);
      if (found?.groupId) groupRepository.getById(found.groupId).then((g) => setGroup(g ?? null));
      else setGroup(null);
    });
  }, [id]);

  useEffect(load, [load]);

  if (job === undefined) return null;
  if (job === null) {
    return <EmptyState title="სამუშაო ვერ მოიძებნა" description="შესაძლოა წაშლილია." />;
  }

  return <JobDetailContent job={job} group={group} onReload={load} />;
}

function JobDetailContent({ job, group, onReload }: { job: Job; group: Group | null; onReload: () => void }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const { cardRef, activeJob, sharing, share } = useJobShare();

  const handleToggleStatus = async () => {
    if (job.status === "archived") {
      await jobRepository.restore(job.id);
      onReload();
      return;
    }
    const ok = await confirm({ title: "სამუშაოს დაარქივება", message: "სამუშაო გადავა არქივში. მონაცემები არ წაიშლება.", danger: false });
    if (!ok) return;
    await jobRepository.archive(job.id);
    onReload();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "სამუშაოს სამუდამო წაშლა",
      message: `„${job.clientSnapshot.fullName || "ეს სამუშაო"}“ სამუდამოდ წაიშლება - ეს ქმედება ვერ გაუქმდება. თუ საკმარისია მისი დამალვა, გამოიყენე „დაარქივება“ ამის ნაცვლად.`,
      danger: true
    });
    if (!ok) return;
    await jobRepository.delete(job.id);
    showToast("სამუშაო წაიშალა.", "ok");
    navigate("/jobs");
  };

  const handleShare = async () => {
    try {
      const outcome = await share(job);
      if (outcome === "shared") showToast("გაზიარება გაიხსნა.", "ok");
      else if (outcome === "downloaded-with-link-copied") showToast("სურათი ჩამოიტვირთა, Maps ლინკი დაკოპირდა — ჩასვი WhatsApp-ში.", "ok");
      else if (outcome === "downloaded-only") showToast("სურათი ჩამოიტვირთა. ეს მოწყობილობა/ბრაუზერი პირდაპირ გაზიარებას ვერ უჭერს მხარს.", "warn");
    } catch (error) {
      console.error("Job share failed:", error);
      showToast("გაზიარება ვერ განხორციელდა, სცადე თავიდან.", "warn");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Plans" title={job.clientSnapshot.fullName || "უსახელო სამუშაო"} />

      <Card className="job-detail__status-card">
        <StatusToggle
          active={job.status !== "archived"}
          activeLabel="აქტიური"
          inactiveLabel="დაარქივებული"
          onToggle={() => void handleToggleStatus()}
        />
        <ShareIconButton onClick={() => void handleShare()} disabled={sharing} />
        <Button onClick={() => setEditOpen(true)}>რედაქტ.</Button>
        <Button variant="danger" onClick={() => void handleDelete()}>
          წაშლა
        </Button>
      </Card>

      <Card className="job-detail__section">
        <h2 className="job-detail__section-title">საკონტაქტო ინფორმაცია</h2>
        <DetailRow label="სახელი" value={job.clientSnapshot.fullName} />
        <DetailRow label="გამყიდველი" value={job.seller} />
        <DetailRow label="მისამართი" value={job.clientSnapshot.address} />
        {job.clientSnapshot.phone && (
          <div className="job-detail__row">
            <span className="job-detail__row-label">ტელეფონი</span>
            <a className="job-detail__phone-link" href={`tel:${job.clientSnapshot.phone}`}>
              {job.clientSnapshot.phone}
            </a>
          </div>
        )}
      </Card>

      <Card className="job-detail__section">
        <h2 className="job-detail__section-title">სამუშაო</h2>
        <DetailRow label="ჯგუფი" value={group?.name} />
        <DetailRow label="თარიღი" value={job.jobDate ? formatDateOnly(job.jobDate) : null} highlight />
        <DetailRow label="ხანგრძლივობა" value={job.jobDurationDays ? `${job.jobDurationDays} დღიანი` : null} highlight />
      </Card>

      <Card className="job-detail__section">
        <h2 className="job-detail__section-title">პაკეტი და დუშთასე</h2>
        <DetailRow label="პაკეტი" value={job.packageType} />
        <DetailRow label="ანტირუჩი" value={job.antiSlip} />
        <DetailRow label="დუშთასეს ზომა" value={job.showerTraySize} />
      </Card>

      <Card className="job-detail__section">
        <h2 className="job-detail__section-title">მასალები</h2>
        <DetailRow label="შუშის ზომა" value={job.glassPartitionSize} />
        <DetailRow label="კარი" value={job.hingedDoorSize} />
        <DetailRow label="პანელის ფერი" value={job.panelColor} />
        <DetailRow label="იატაკის პანელის ფერი" value={job.floorPanelColor} />
        <DetailRow label="პანელი სადამდე კეთდება" value={job.panelHeight} />
        <DetailRow label="დასაყენებლების სია" value={job.installables} />
      </Card>

      <Card className="job-detail__section">
        <h2 className="job-detail__section-title">დამატებითი სამუშაოები და შენიშვნები</h2>
        <DetailRow label="დამატებითი სამუშაოები" value={job.extraWork} />
        <DetailRow label="სამუშაო შენიშვნები" value={job.workNotes} />
      </Card>

      <JobForm open={editOpen} onClose={() => setEditOpen(false)} job={job} onSaved={onReload} />

      {/* Offscreen - only used as html2canvas's rasterization source when sharing. */}
      <JobShareCard ref={cardRef} job={activeJob} />
    </div>
  );
}
