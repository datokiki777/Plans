import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { LocalCorrectionRepository } from "./correction.repository";
import { LocalCorrectionFileRepository } from "./correction-file.repository";

describe("LocalCorrectionRepository", () => {
  let testDb: AppDatabase;
  let repo: LocalCorrectionRepository;
  let files: LocalCorrectionFileRepository;

  beforeEach(() => {
    testDb = new AppDatabase(`test-${crypto.randomUUID()}`);
    repo = new LocalCorrectionRepository(testDb);
    files = new LocalCorrectionFileRepository(testDb);
  });

  afterEach(async () => {
    testDb.close();
    await testDb.delete();
  });

  it("create() defaults status to pending, comment/resolvedDate empty", async () => {
    const correction = await repo.create({ jobId: "job-1" });
    expect(correction.status).toBe("pending");
    expect(correction.comment).toBe("");
    expect(correction.resolvedDate).toBeNull();
  });

  it("create() accepts explicit values", async () => {
    const correction = await repo.create({ jobId: "job-1", comment: "კუთხე", status: "fixed", resolvedDate: "2026-09-10" });
    expect(correction.comment).toBe("კუთხე");
    expect(correction.status).toBe("fixed");
    expect(correction.resolvedDate).toBe("2026-09-10");
  });

  it("listByJob returns only that job's corrections, newest first", async () => {
    const older = await repo.create({ jobId: "job-1", comment: "პირველი" });
    await new Promise((r) => setTimeout(r, 2));
    const newer = await repo.create({ jobId: "job-1", comment: "მეორე" });
    await repo.create({ jobId: "job-2", comment: "სხვა საქმე" });

    const result = await repo.listByJob("job-1");
    expect(result.map((c) => c.id)).toEqual([newer.id, older.id]);
  });

  it("listAll returns corrections across every job", async () => {
    await repo.create({ jobId: "job-1" });
    await repo.create({ jobId: "job-2" });
    expect(await repo.listAll()).toHaveLength(2);
  });

  it("update() changes status/comment/resolvedDate", async () => {
    const correction = await repo.create({ jobId: "job-1" });
    await repo.update(correction.id, { status: "fixed", comment: "შეკეთდა", resolvedDate: "2026-09-15" });

    const updated = await repo.getById(correction.id);
    expect(updated?.status).toBe("fixed");
    expect(updated?.comment).toBe("შეკეთდა");
    expect(updated?.resolvedDate).toBe("2026-09-15");
  });

  it("delete() removes the correction AND its files", async () => {
    const correction = await repo.create({ jobId: "job-1" });
    await files.add({ correctionId: correction.id, fileType: "image", fileName: "a.jpg", blob: new Blob(["x"]) });
    await files.add({ correctionId: correction.id, fileType: "image", fileName: "b.jpg", blob: new Blob(["y"]) });

    await repo.delete(correction.id);

    expect(await repo.getById(correction.id)).toBeUndefined();
    expect(await files.listByCorrection(correction.id)).toHaveLength(0);
  });

  it("deleteByJob() removes every correction (and their files) for that job, leaves other jobs' corrections alone", async () => {
    const c1 = await repo.create({ jobId: "job-1" });
    const c2 = await repo.create({ jobId: "job-1" });
    const other = await repo.create({ jobId: "job-2" });
    await files.add({ correctionId: c1.id, fileType: "image", fileName: "a.jpg", blob: new Blob(["x"]) });
    await files.add({ correctionId: c2.id, fileType: "pdf", fileName: "b.pdf", blob: new Blob(["y"]) });

    await repo.deleteByJob("job-1");

    expect(await repo.listByJob("job-1")).toHaveLength(0);
    expect(await files.listByCorrection(c1.id)).toHaveLength(0);
    expect(await files.listByCorrection(c2.id)).toHaveLength(0);
    expect(await repo.getById(other.id)).toBeDefined(); // untouched
  });

  it("deleteByJob() on a job with no corrections at all does not throw", async () => {
    await expect(repo.deleteByJob("job-with-nothing")).resolves.not.toThrow();
  });
});
