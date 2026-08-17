import { z } from "zod";
import { isDateOnlyString } from "@/shared/lib/date";

export const jobFormSchema = z.object({
  fullName: z.string().trim().min(1, "სახელი აუცილებელია"),
  seller: z.string().trim(),
  address: z.string().trim(),
  phone: z.string().trim(),
  googleMapsLink: z.string().trim(),
  groupId: z.string().trim().min(1, "ჯგუფი აუცილებელია"),
  jobDate: z
    .string()
    .trim()
    .refine((v) => v === "" || isDateOnlyString(v), "თარიღის ფორმატი არასწორია"),
  jobDurationDays: z.string().trim(),
  packageType: z.string().trim(),
  antiSlip: z.string().trim(),
  showerTraySize: z.string().trim(),
  glassPartitionSizeText: z.string(),
  hingedDoorSize: z.string().trim(),
  panelColor: z.string().trim(),
  floorPanelColor: z.string().trim(),
  panelHeight: z.string().trim(),
  installablesText: z.string(),
  extraWorkText: z.string(),
  workNotesText: z.string()
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const JOB_FORM_DEFAULTS: JobFormValues = {
  fullName: "",
  seller: "",
  address: "",
  phone: "",
  googleMapsLink: "",
  groupId: "",
  jobDate: "",
  jobDurationDays: "",
  packageType: "",
  antiSlip: "",
  showerTraySize: "",
  glassPartitionSizeText: "",
  hingedDoorSize: "",
  panelColor: "",
  floorPanelColor: "",
  panelHeight: "",
  installablesText: "",
  extraWorkText: "",
  workNotesText: ""
};

function textToLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function linesToText(lines: string[]): string {
  return lines.join("\n");
}

/** Converts submitted form values into the persisted-shape Job fields
 * (excludes id/clientId/status/timestamps, which the caller supplies -
 * clientId is resolved separately since it depends on a dedup lookup, not
 * a pure transform). Name/address/phone map directly into clientSnapshot -
 * the form has no separate "client" step, matching the simplified model
 * (a Job's contact details ARE the form, not a picked reference). seller
 * is a plain Job field (not part of clientSnapshot - it's about who sold
 * the job, not the customer). */
export function jobFormToPersistedFields(values: JobFormValues) {
  return {
    seller: values.seller,
    groupId: values.groupId || null,
    jobDate: values.jobDate || null,
    jobDurationDays: values.jobDurationDays ? Number(values.jobDurationDays) : null,
    packageType: values.packageType,
    antiSlip: values.antiSlip,
    showerTraySize: values.showerTraySize,
    glassPartitionSize: textToLines(values.glassPartitionSizeText),
    hingedDoorSize: values.hingedDoorSize,
    panelColor: values.panelColor,
    floorPanelColor: values.floorPanelColor,
    panelHeight: values.panelHeight,
    installables: textToLines(values.installablesText),
    extraWork: textToLines(values.extraWorkText),
    workNotes: textToLines(values.workNotesText),
    clientSnapshot: { fullName: values.fullName, address: values.address, phone: values.phone }
  };
}

/** The inverse - used to populate the edit form from a persisted Job.
 * Name/address/phone come from the Job's own clientSnapshot (historically
 * accurate as of when this Job was saved). */
export function jobToFormValues(job: {
  clientSnapshot: { fullName: string; address: string; phone: string };
  seller: string;
  groupId: string | null;
  jobDate: string | null;
  jobDurationDays: number | null;
  packageType: string;
  antiSlip: string;
  showerTraySize: string;
  glassPartitionSize: string[];
  hingedDoorSize: string;
  panelColor: string;
  floorPanelColor: string;
  panelHeight: string;
  installables: string[];
  extraWork: string[];
  workNotes: string[];
}): Omit<JobFormValues, "googleMapsLink"> {
  return {
    fullName: job.clientSnapshot.fullName,
    seller: job.seller,
    address: job.clientSnapshot.address,
    phone: job.clientSnapshot.phone,
    groupId: job.groupId ?? "",
    jobDate: job.jobDate ?? "",
    jobDurationDays: job.jobDurationDays ? String(job.jobDurationDays) : "",
    packageType: job.packageType,
    antiSlip: job.antiSlip,
    showerTraySize: job.showerTraySize,
    glassPartitionSizeText: linesToText(job.glassPartitionSize),
    hingedDoorSize: job.hingedDoorSize,
    panelColor: job.panelColor,
    floorPanelColor: job.floorPanelColor,
    panelHeight: job.panelHeight,
    installablesText: linesToText(job.installables),
    extraWorkText: linesToText(job.extraWork),
    workNotesText: linesToText(job.workNotes)
  };
}
