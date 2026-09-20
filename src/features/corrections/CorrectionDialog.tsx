import { useEffect, useState } from "react";
import { Dialog } from "@/shared/ui/Dialog";
import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import { FormField, Select, Textarea, Input } from "@/shared/ui/fields";
import { useToast } from "@/shared/ui/Toast";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { correctionRepository, correctionFileRepository } from "@/db/repositories";
import { CORRECTION_STATUS_LABELS, isCorrectionResolved, type Correction, type CorrectionStatus } from "@/entities/correction";
import type { CorrectionFile } from "@/entities/correction-file";
import { compressImage } from "@/shared/lib/imageCompress";
import { formatDateOnly, todayDateOnly } from "@/shared/lib/date";
import "./CorrectionDialog.css";

export interface CorrectionDialogProps {
  correction: Correction | null;
  onClose: () => void;
  onChanged: () => void;
}

const STATUS_OPTIONS: CorrectionStatus[] = ["pending", "fixed", "not-applicable"];

/** Edits one correction (status/comment/resolved date) plus its attached
 * photo/PDF gallery. The correction record already exists in the
 * database by the time this opens (CorrectionsPage creates a bare draft
 * immediately on "+ ახალი", so files can be attached from the very first
 * moment) - closing this dialog with nothing filled in and no files
 * quietly deletes that empty draft, so an abandoned "+ ახალი" tap never
 * leaves clutter behind. */
export function CorrectionDialog({ correction, onClose, onChanged }: CorrectionDialogProps) {
  const [status, setStatus] = useState<CorrectionStatus>("pending");
  const [comment, setComment] = useState("");
  const [resolvedDate, setResolvedDate] = useState("");
  const [files, setFiles] = useState<CorrectionFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const showToast = useToast();
  const confirm = useConfirm();

  const reloadFiles = async (correctionId: string) => {
    setFiles(await correctionFileRepository.listByCorrection(correctionId));
  };

  useEffect(() => {
    if (!correction) return;
    setStatus(correction.status);
    setComment(correction.comment);
    setResolvedDate(correction.resolvedDate ?? "");
    void reloadFiles(correction.id);
  }, [correction]);

  if (!correction) return null;

  const persist = async (patch: Partial<{ status: CorrectionStatus; comment: string; resolvedDate: string | null }>) => {
    const nextStatus = patch.status ?? status;
    const nextComment = patch.comment ?? comment;
    // Resolving auto-fills today's date if none was set yet; going back
    // to "pending" clears it - a resolved date only makes sense once
    // something is actually resolved.
    let nextResolvedDate: string | null = patch.resolvedDate !== undefined ? patch.resolvedDate : resolvedDate || null;
    if (patch.status) {
      nextResolvedDate = isCorrectionResolved(patch.status) ? (resolvedDate || todayDateOnly()) : null;
    }
    setStatus(nextStatus);
    setComment(nextComment);
    setResolvedDate(nextResolvedDate ?? "");
    await correctionRepository.update(correction.id, { status: nextStatus, comment: nextComment, resolvedDate: nextResolvedDate });
    onChanged();
  };

  const handleAddImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const blob = await compressImage(file);
        await correctionFileRepository.add({ correctionId: correction.id, fileType: "image", fileName: file.name, blob });
      }
      await reloadFiles(correction.id);
      onChanged();
    } catch (error) {
      console.error("Image upload failed:", error);
      showToast("სურათის ატვირთვა ვერ მოხერხდა.", "warn");
    } finally {
      setUploading(false);
    }
  };

  const handleAddPdf = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    await correctionFileRepository.add({ correctionId: correction.id, fileType: "pdf", fileName: file.name, blob: file });
    await reloadFiles(correction.id);
    onChanged();
  };

  const handleDeleteFile = async (file: CorrectionFile) => {
    const ok = await confirm({ title: "ფაილის წაშლა", message: `„${file.fileName}“ წაიშლება. გავაგრძელოთ?`, danger: true });
    if (!ok) return;
    await correctionFileRepository.delete(file.id);
    await reloadFiles(correction.id);
    onChanged();
  };

  const handleDeleteCorrection = async () => {
    const ok = await confirm({
      title: "გამოსასწორებლის წაშლა",
      message: "გამოსასწორებელი და მისი ყველა ფაილი წაიშლება. გავაგრძელოთ?",
      danger: true
    });
    if (!ok) return;
    await correctionRepository.delete(correction.id);
    onChanged();
    onClose();
  };

  const handleClose = async () => {
    if (!comment.trim() && files.length === 0) {
      // Abandoned "+ ახალი" tap - clean up the empty draft silently.
      await correctionRepository.delete(correction.id);
      onChanged();
    }
    onClose();
  };

  return (
    <Dialog open={correction !== null} onClose={() => void handleClose()} title="გამოსასწორებელი">
      <div className="correction-dialog">
        <FormField label="სტატუსი">
          <Select value={status} onChange={(e) => void persist({ status: e.target.value as CorrectionStatus })}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {CORRECTION_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>

        {isCorrectionResolved(status) && (
          <FormField label="თარიღი">
            <Input type="date" value={resolvedDate} onChange={(e) => void persist({ resolvedDate: e.target.value || null })} />
          </FormField>
        )}

        <FormField label="კომენტარი">
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} onBlur={() => void persist({ comment })} />
        </FormField>

        <div className="correction-dialog__files">
          <span className="ui-form-field__label">ფაილები</span>
          {files.length > 0 && (
            <div className="correction-dialog__gallery">
              {files.map((file) => (
                <div key={file.id} className="correction-dialog__file">
                  {file.fileType === "image" ? (
                    <img src={URL.createObjectURL(file.blob)} alt={file.fileName} className="correction-dialog__thumb" />
                  ) : (
                    <a href={URL.createObjectURL(file.blob)} target="_blank" rel="noopener noreferrer" className="correction-dialog__pdf-link">
                      📄 {file.fileName}
                    </a>
                  )}
                  <IconButton label="ფაილის წაშლა" className="correction-dialog__file-delete" onClick={() => void handleDeleteFile(file)}>
                    ×
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          <div className="correction-dialog__upload-row">
            <label className="correction-dialog__upload-button">
              {uploading ? "იტვირთება…" : "+ სურათი"}
              <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => void handleAddImages(e.target.files)} />
            </label>
            <label className="correction-dialog__upload-button">
              + PDF
              <input type="file" accept="application/pdf" hidden onChange={(e) => void handleAddPdf(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="correction-dialog__footer">
          <span className="correction-dialog__created">დამატებულია: {formatDateOnly(correction.createdAt.slice(0, 10))}</span>
          <Button variant="danger" onClick={() => void handleDeleteCorrection()}>
            წაშლა
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
