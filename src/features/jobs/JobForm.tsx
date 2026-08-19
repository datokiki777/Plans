import { useEffect, useState } from "react";
import { useForm, Controller, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { FormField, Input, Textarea } from "@/shared/ui/fields";
import { SelectField } from "@/shared/ui/SelectField";
import { useToast } from "@/shared/ui/Toast";
import { clientRepository, groupRepository, jobRepository } from "@/db/repositories";
import type { Group } from "@/entities/group";
import type { Job } from "@/entities/job";
import { jobFormSchema, JOB_FORM_DEFAULTS, jobFormToPersistedFields, jobToFormValues, type JobFormValues } from "@/entities/job";
import { findMatchingClient } from "@/entities/client";
import { normalizeMapsLink } from "@/shared/lib/maps";
import { TEMPLATE_FIELD_KEYS, TEMPLATE_FIELD_LABELS, type FieldTemplate, type TemplateFieldKey } from "@/entities/template";
import { useAllFieldTemplates } from "@/features/templates/useFieldTemplates";
import { TemplateFieldButton } from "@/features/templates/TemplateFieldButton";
import "./JobForm.css";

export interface JobFormProps {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
  /** Pre-select a group, e.g. the group currently selected on the Jobs list -
   * still changeable in the form. */
  initialGroupId?: string;
  onSaved: (job: Job) => void;
}

const DURATION_OPTIONS = ["1", "2", "3", "4", "5", "6", "7"];

type SingleTemplateFieldName = Exclude<TemplateFieldKey, "glassPartitionSize" | "installables">;

const SINGLE_TEMPLATE_FIELDS: SingleTemplateFieldName[] = [
  "packageType",
  "antiSlip",
  "showerTraySize",
  "hingedDoorSize",
  "panelColor",
  "floorPanelColor",
  "panelHeight"
];

export function JobForm({ open, onClose, job, initialGroupId, onSaved }: JobFormProps) {
  const showToast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const { byField: templatesByField } = useAllFieldTemplates(TEMPLATE_FIELD_KEYS);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: JOB_FORM_DEFAULTS
  });

  useEffect(() => {
    if (!open) return;
    groupRepository.list().then(setGroups);
    reset(job ? { ...jobToFormValues(job), googleMapsLink: "" } : { ...JOB_FORM_DEFAULTS, groupId: initialGroupId ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job, initialGroupId]);

  const resolveClientId = async (values: JobFormValues): Promise<string> => {
    const googleMapsLink = normalizeMapsLink(values.googleMapsLink);
    if (job) {
      await clientRepository.update(job.clientId, {
        fullName: values.fullName,
        address: values.address,
        phone: values.phone,
        ...(googleMapsLink ? { googleMapsLink } : {})
      });
      return job.clientId;
    }
    const existing = await clientRepository.list({ includeArchived: true });
    const match = findMatchingClient(existing, values);
    if (match) return match.id;
    const created = await clientRepository.create({
      fullName: values.fullName,
      address: values.address,
      phone: values.phone,
      googleMapsLink,
      notes: ""
    });
    return created.id;
  };

  const onSubmit = handleSubmit(async (values) => {
    const fields = jobFormToPersistedFields(values);
    const clientId = await resolveClientId(values);

    if (job) {
      const patch = { ...fields, clientId };
      await jobRepository.update(job.id, patch);
      onSaved({ ...job, ...patch });
      showToast("სამუშაო განახლდა.", "ok");
    } else {
      // New jobs default to "active", not "planned" - the Jobs page tabs
      // (ყველა/აქტიური/დაარქივებული) intentionally exclude planned/completed,
      // so a job created as "planned" would save successfully but never
      // appear anywhere until manually changed from the detail screen.
      const created = await jobRepository.create({ ...fields, clientId, status: "active" });
      onSaved(created);
      showToast("სამუშაო დაემატა.", "ok");
    }
    onClose();
  });

  const glassText = watch("glassPartitionSizeText");
  const installablesText = watch("installablesText");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={job ? "სამუშაოს რედაქტირება" : "ახალი სამუშაო"}
      footer={
        <>
          <Button onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => void onSubmit()} disabled={isSubmitting}>
            შენახვა
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="job-form">
        <FormField label="ჯგუფი" error={errors.groupId?.message}>
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <SelectField
                value={field.value}
                onChange={field.onChange}
                placeholder="— აირჩიე ჯგუფი —"
                title="ჯგუფის არჩევა"
                options={groups.map((g) => ({ value: g.id, label: g.name }))}
              />
            )}
          />
        </FormField>

        <FormField label="სახელი და გვარი" error={errors.fullName?.message}>
          <Input {...register("fullName")} autoComplete="off" />
        </FormField>
        <FormField label="გამყიდველი">
          <Input {...register("seller")} autoComplete="off" />
        </FormField>
        <div className="job-form__two-col">
          <FormField label="მისამართი">
            <Input {...register("address")} autoComplete="off" />
          </FormField>
          <FormField label="ტელეფონი">
            <Input {...register("phone")} type="tel" autoComplete="off" />
          </FormField>
        </div>
        <FormField label="Google Maps ლინკი" hint="ლინკი ან უბრალო მისამართი - ავტომატურად გადაკეთდება">
          <Input {...register("googleMapsLink")} type="url" autoComplete="off" />
        </FormField>

        <div className="job-form__two-col">
          <FormField label="სამუშაოს თარიღი" error={errors.jobDate?.message}>
            <Input type="date" {...register("jobDate")} />
          </FormField>
          <FormField label="ხანგრძლივობა">
            <Controller
              name="jobDurationDays"
              control={control}
              render={({ field }) => (
                <SelectField
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="—"
                  title="ხანგრძლივობის არჩევა"
                  options={DURATION_OPTIONS.map((d) => ({ value: d, label: `${d} დღიანი` }))}
                />
              )}
            />
          </FormField>
        </div>

        <h3 className="job-form__section-title">პაკეტი და დუშთასე</h3>
        <div className="job-form__two-col">
          {SINGLE_TEMPLATE_FIELDS.slice(0, 2).map((name) => (
            <TemplatedField
              key={name}
              name={name}
              register={register}
              templates={templatesByField[name] ?? []}
              watch={watch}
              setValue={setValue}
            />
          ))}
        </div>
        <TemplatedField
          name="showerTraySize"
          register={register}
          templates={templatesByField.showerTraySize ?? []}
          watch={watch}
          setValue={setValue}
        />

        <h3 className="job-form__section-title">მასალები</h3>
        <div className="job-form__field-with-button">
          <FormField label={TEMPLATE_FIELD_LABELS.glassPartitionSize}>
            <Controller name="glassPartitionSizeText" control={control} render={({ field }) => <Textarea rows={2} {...field} />} />
          </FormField>
          <TemplateFieldButton
            fieldKey="glassPartitionSize"
            templates={templatesByField.glassPartitionSize ?? []}
            value={glassText}
            onChange={(v) => setValue("glassPartitionSizeText", v, { shouldDirty: true })}
          />
        </div>

        {SINGLE_TEMPLATE_FIELDS.slice(3).map((name) => (
          <TemplatedField
            key={name}
            name={name}
            register={register}
            templates={templatesByField[name] ?? []}
            watch={watch}
            setValue={setValue}
          />
        ))}

        <div className="job-form__field-with-button">
          <FormField label={TEMPLATE_FIELD_LABELS.installables}>
            <Controller name="installablesText" control={control} render={({ field }) => <Textarea rows={4} {...field} />} />
          </FormField>
          <TemplateFieldButton
            fieldKey="installables"
            templates={templatesByField.installables ?? []}
            value={installablesText}
            onChange={(v) => setValue("installablesText", v, { shouldDirty: true })}
          />
        </div>

        <h3 className="job-form__section-title">დამატებითი სამუშაოები და შენიშვნები</h3>
        <FormField label="დამატებითი სამუშაოები">
          <Textarea rows={5} {...register("extraWorkText")} />
        </FormField>
        <FormField label="სამუშაო შენიშვნები">
          <Textarea rows={3} {...register("workNotesText")} />
        </FormField>
      </form>
    </Dialog>
  );
}

interface TemplatedFieldProps {
  name: SingleTemplateFieldName;
  register: UseFormRegister<JobFormValues>;
  templates: FieldTemplate[];
  watch: UseFormWatch<JobFormValues>;
  setValue: UseFormSetValue<JobFormValues>;
}

function TemplatedField({ name, register, templates, watch, setValue }: TemplatedFieldProps) {
  const value = watch(name);
  return (
    <div className="job-form__field-with-button">
      <FormField label={TEMPLATE_FIELD_LABELS[name]}>
        <Input {...register(name)} autoComplete="off" />
      </FormField>
      <TemplateFieldButton fieldKey={name} templates={templates} value={value} onChange={(v) => setValue(name, v, { shouldDirty: true })} />
    </div>
  );
}
