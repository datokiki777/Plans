import type { AppDatabase } from "@/db/database";
import type { Correction, NewCorrectionInput, CorrectionStatus } from "@/entities/correction";
import { createId, nowIso } from "@/shared/lib/id";

export interface CorrectionUpdate {
  comment: string;
  status: CorrectionStatus;
  resolvedDate: string | null;
}

export interface CorrectionRepository {
  getById(id: string): Promise<Correction | undefined>;
  listByJob(jobId: string): Promise<Correction[]>;
  /** Every correction across every job - the top-bar "გამოსასწორებლები"
   * page's data source. */
  listAll(): Promise<Correction[]>;
  create(input: NewCorrectionInput): Promise<Correction>;
  update(id: string, patch: CorrectionUpdate): Promise<void>;
  /** Deletes the correction AND its files (see CorrectionFileRepository) -
   * called directly by JobRepository.delete() as part of a job's
   * permanent-delete cascade; never called on a job archive, which leaves
   * corrections untouched. */
  delete(id: string): Promise<void>;
  /** Deletes every correction (and their files) belonging to a job - used
   * by JobRepository.delete()'s cascade. */
  deleteByJob(jobId: string): Promise<void>;
}

export class LocalCorrectionRepository implements CorrectionRepository {
  private readonly db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  async getById(id: string): Promise<Correction | undefined> {
    return this.db.corrections.get(id);
  }

  async listByJob(jobId: string): Promise<Correction[]> {
    const list = await this.db.corrections.where("jobId").equals(jobId).toArray();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listAll(): Promise<Correction[]> {
    const list = await this.db.corrections.toArray();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: NewCorrectionInput): Promise<Correction> {
    const now = nowIso();
    const correction: Correction = {
      status: "pending",
      comment: "",
      resolvedDate: null,
      ...input,
      id: createId(),
      createdAt: now,
      updatedAt: now
    };
    await this.db.corrections.add(correction);
    return correction;
  }

  async update(id: string, patch: CorrectionUpdate): Promise<void> {
    await this.db.corrections.update(id, { ...patch, updatedAt: nowIso() });
  }

  async delete(id: string): Promise<void> {
    await this.db.correctionFiles.where("correctionId").equals(id).delete();
    await this.db.corrections.delete(id);
  }

  async deleteByJob(jobId: string): Promise<void> {
    const ids = await this.db.corrections.where("jobId").equals(jobId).primaryKeys();
    if (ids.length > 0) {
      await this.db.correctionFiles.where("correctionId").anyOf(ids).delete();
    }
    await this.db.corrections.where("jobId").equals(jobId).delete();
  }
}
