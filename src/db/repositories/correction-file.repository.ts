import type { AppDatabase } from "@/db/database";
import type { CorrectionFile, NewCorrectionFileInput } from "@/entities/correction-file";
import { createId, nowIso } from "@/shared/lib/id";

export interface CorrectionFileRepository {
  listByCorrection(correctionId: string): Promise<CorrectionFile[]>;
  add(input: NewCorrectionFileInput): Promise<CorrectionFile>;
  delete(id: string): Promise<void>;
}

export class LocalCorrectionFileRepository implements CorrectionFileRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async listByCorrection(correctionId: string): Promise<CorrectionFile[]> {
    const list = await this.db.correctionFiles.where("correctionId").equals(correctionId).toArray();
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async add(input: NewCorrectionFileInput): Promise<CorrectionFile> {
    const file: CorrectionFile = { id: createId(), ...input, createdAt: nowIso() };
    await this.db.correctionFiles.add(file);
    return file;
  }

  async delete(id: string): Promise<void> {
    await this.db.correctionFiles.delete(id);
  }
}
