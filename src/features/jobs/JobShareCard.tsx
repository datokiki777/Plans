import { forwardRef } from "react";
import type { Job } from "@/entities/job";
import { hasShareValue, formatJobShareSchedule } from "@/entities/job";
import "./JobShareCard.css";

export interface JobShareCardProps {
  job: Job;
  groupName?: string | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="job-share-card__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!hasShareValue(value)) return null;
  return (
    <p>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function ListField({ items }: { items: string[] }) {
  if (!hasShareValue(items)) return null;
  return (
    <ul>
      {items.filter((i) => i.trim()).map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Same section layout/order as V1's buildPrintableReportContent, minus the
 * sketch (out of V2 scope). Every field/section is omitted entirely when
 * empty, matching V1's hasValue-driven omission. */
export const JobShareCard = forwardRef<HTMLDivElement, JobShareCardProps>(function JobShareCard({ job, groupName }, ref) {
  const schedule = formatJobShareSchedule(job);
  const hasClientSection =
    hasShareValue(job.clientSnapshot.fullName) ||
    hasShareValue(job.clientSnapshot.address) ||
    hasShareValue(job.clientSnapshot.phone) ||
    hasShareValue(schedule);
  const hasPackageSection = hasShareValue(job.packageType) || hasShareValue(job.showerTraySize) || hasShareValue(job.antiSlip);
  const hasMaterialsSection =
    hasShareValue(job.glassPartitionSize) ||
    hasShareValue(job.hingedDoorSize) ||
    hasShareValue(job.panelColor) ||
    hasShareValue(job.floorPanelColor) ||
    hasShareValue(job.panelHeight) ||
    hasShareValue(job.installables);

  return (
    <div ref={ref} className="job-share-card">
      <h1>Plans</h1>
      <p className="job-share-card__subtitle">ქართული სამუშაო ანგარიში</p>

      {hasClientSection && (
        <Section title="კლიენტის მონაცემები">
          <Field label="კლიენტი" value={job.clientSnapshot.fullName} />
          <Field label="მისამართი" value={job.clientSnapshot.address} />
          <Field label="ტელეფონი" value={job.clientSnapshot.phone} />
          <Field label="სამუშაოს თარიღი" value={schedule} />
          <Field label="ჯგუფი" value={groupName} />
        </Section>
      )}

      {hasPackageSection && (
        <Section title="პაკეტი და დუშთასე">
          <Field label="პაკეტი" value={job.packageType} />
          <Field label="დუშთასე" value={job.showerTraySize} />
          <Field label="ანტირუჩი" value={job.antiSlip} />
        </Section>
      )}

      {hasMaterialsSection && (
        <Section title="მასალები">
          <Field label="შუშის ზომა" value={job.glassPartitionSize.join(", ")} />
          <Field label="კარი" value={job.hingedDoorSize} />
          <Field label="პანელის ფერი" value={job.panelColor} />
          <Field label="იატაკის პანელის ფერი" value={job.floorPanelColor} />
          <Field label="პანელი სადამდე კეთდება" value={job.panelHeight} />
          {hasShareValue(job.installables) && (
            <>
              <h3>დასაყენებლების სია</h3>
              <ListField items={job.installables} />
            </>
          )}
        </Section>
      )}

      {hasShareValue(job.extraWork) && (
        <Section title="დამატებითი სამუშაოები">
          <ListField items={job.extraWork} />
        </Section>
      )}

      {hasShareValue(job.workNotes) && (
        <Section title="შენიშვნები">
          <ListField items={job.workNotes} />
        </Section>
      )}
    </div>
  );
});
