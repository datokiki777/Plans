import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { FormField, Input } from "@/shared/ui/fields";
import { useToast } from "@/shared/ui/Toast";
import { groupRepository } from "@/db/repositories";
import { groupFormSchema, type GroupFormValues } from "@/entities/group";
import type { Group } from "@/entities/group";

export interface GroupFormProps {
  open: boolean;
  onClose: () => void;
  group: Group | null;
  onSaved: () => void;
}

/** Edit dialog for an existing group - name, plus the optional car number
 * and two worker names. Existing (date-in-name style) groups can fill
 * these in whenever it's convenient - nothing requires it. */
export function GroupForm({ open, onClose, group, onSaved }: GroupFormProps) {
  const showToast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "", carNumber: "", worker1Name: "", worker2Name: "" }
  });

  useEffect(() => {
    if (open) {
      reset({
        name: group?.name ?? "",
        carNumber: group?.carNumber ? String(group.carNumber) : "",
        worker1Name: group?.worker1Name ?? "",
        worker2Name: group?.worker2Name ?? ""
      });
    }
  }, [open, group, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!group) return;
    await groupRepository.rename(group.id, values.name);
    await groupRepository.updateDetails(group.id, {
      carNumber: values.carNumber ? Number(values.carNumber) : null,
      worker1Name: values.worker1Name,
      worker2Name: values.worker2Name
    });
    showToast("ჯგუფი შენახულია.", "ok");
    onSaved();
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ჯგუფის რედაქტირება"
      footer={
        <>
          <Button onClick={onClose}>გაუქმება</Button>
          <Button variant="primary" onClick={() => void onSubmit()} disabled={isSubmitting}>
            შენახვა
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)}>
        <FormField label="დასახელება" error={errors.name?.message}>
          <Input {...register("name")} autoComplete="off" autoFocus />
        </FormField>
        <FormField label="მანქანის ნომერი" hint="არასავალდებულო">
          <Input type="number" inputMode="numeric" {...register("carNumber")} autoComplete="off" />
        </FormField>
        <FormField label="მუშა 1" hint="არასავალდებულო">
          <Input {...register("worker1Name")} autoComplete="off" />
        </FormField>
        <FormField label="მუშა 2" hint="არასავალდებულო">
          <Input {...register("worker2Name")} autoComplete="off" />
        </FormField>
      </form>
    </Dialog>
  );
}
