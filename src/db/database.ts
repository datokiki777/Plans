import Dexie, { type EntityTable } from "dexie";
import type { Client } from "@/entities/client";
import type { Job } from "@/entities/job";
import type { Group } from "@/entities/group";
import type { FieldTemplate } from "@/entities/template";
import type { LoadingList } from "@/entities/loading-list";
import type { LoadingItem } from "@/entities/loading-item";
import type { Worker } from "@/entities/worker";
import type { Stay } from "@/entities/stay";
import type { GroupPeriod } from "@/entities/group-period";
import type { MigrationRecord } from "@/entities/migration-record";

/**
 * V2's database name is deliberately different from V1's ("shower-plan-assistant")
 * so the two never collide and V1 stays fully recoverable/untouched - see
 * MIGRATION_PLAN.md and the Phase 2 brief. Application code must never open
 * "shower-plan-assistant" (V1's database) in read/write mode; the legacy
 * importer (a later phase) reads V1 data only from the exported JSON file,
 * never live from V1's IndexedDB.
 */
export const V2_DB_NAME = "shower-plan-assistant-v2";

export class AppDatabase extends Dexie {
  clients!: EntityTable<Client, "id">;
  jobs!: EntityTable<Job, "id">;
  groups!: EntityTable<Group, "id">;
  fieldTemplates!: EntityTable<FieldTemplate, "id">;
  loadingLists!: EntityTable<LoadingList, "id">;
  loadingItems!: EntityTable<LoadingItem, "id">;
  workers!: EntityTable<Worker, "id">;
  stays!: EntityTable<Stay, "id">;
  groupPeriods!: EntityTable<GroupPeriod, "id">;
  migrationRecords!: EntityTable<MigrationRecord, "id">;

  constructor(name: string = V2_DB_NAME) {
    super(name);

    // Schema version 1. Every future schema change is a NEW db.version(n)
    // block below this one - never edit this block directly once it has
    // shipped. See ARCHITECTURE.md §4 and DATA_MODEL.md §8 for the index
    // choices and why each one is justified by an actual query pattern
    // (never over-indexed - see the Phase 2 brief).
    this.version(1).stores({
      clients: "id, fullName, archivedAt",
      jobs: "id, clientId, groupId, status, jobDate, [groupId+status]",
      groups: "id, name, archivedAt",
      fieldTemplates: "id, fieldKey, [fieldKey+sortOrder]",
      loadingLists: "id, archivedAt",
      loadingItems: "id, loadingListId, [loadingListId+category]",
      workers: "id, archivedAt",
      stays: "id, workerId, [workerId+entryDate]",
      migrationRecords: "id, sourceExportId"
    });

    // Version 2: adds Job.statusBeforeArchive so archive/restore preserves
    // the Job's real business status (planned/active/completed) instead of
    // always forcing "active" on restore - see entities/job/types.ts and
    // DATA_MODEL.md §2. No index change (the field isn't queried on), so
    // only an upgrade() is needed, not a new .stores() definition - existing
    // jobs are backfilled with statusBeforeArchive: null (the same "no
    // remembered prior status" value new/legacy-imported archived Jobs get;
    // restore() falls back to "active" for those, never guesses "completed").
    this.version(2).upgrade(async (tx) => {
      await tx
        .table("jobs")
        .toCollection()
        .modify((job: { statusBeforeArchive?: unknown }) => {
          if (job.statusBeforeArchive === undefined) {
            job.statusBeforeArchive = null;
          }
        });
    });

    // Version 3: adds Job.seller (who sold/took the job) - free text,
    // not indexed, so only an upgrade() backfill is needed, same pattern
    // as version 2's statusBeforeArchive.
    this.version(3).upgrade(async (tx) => {
      await tx
        .table("jobs")
        .toCollection()
        .modify((job: { seller?: unknown }) => {
          if (job.seller === undefined) {
            job.seller = "";
          }
        });
    });

    // Version 4: adds LoadingList.specialNote - a single, always-present,
    // free-text field (not part of the repeatable items list) - not
    // indexed, so only an upgrade() backfill is needed, same pattern as
    // version 2/3.
    this.version(4).upgrade(async (tx) => {
      await tx
        .table("loadingLists")
        .toCollection()
        .modify((list: { specialNote?: unknown }) => {
          if (list.specialNote === undefined) {
            list.specialNote = "";
          }
        });
    });

    // Version 5: adds the groupPeriods table (a group/car's planned work
    // periods - complete date ranges, unlike Stay's entry/exit-later
    // model) - a genuinely new table, so this needs a full .stores()
    // definition (all prior tables repeated unchanged, Dexie's
    // requirement for any schema/index change), not just an upgrade().
    // Also backfills Group.carNumber/worker1Name/worker2Name for every
    // existing group - all optional going forward, existing groups are
    // left exactly as they were otherwise.
    this.version(5)
      .stores({
        clients: "id, fullName, archivedAt",
        jobs: "id, clientId, groupId, status, jobDate, [groupId+status]",
        groups: "id, name, archivedAt",
        fieldTemplates: "id, fieldKey, [fieldKey+sortOrder]",
        loadingLists: "id, archivedAt",
        loadingItems: "id, loadingListId, [loadingListId+category]",
        workers: "id, archivedAt",
        stays: "id, workerId, [workerId+entryDate]",
        groupPeriods: "id, groupId, [groupId+startDate]",
        migrationRecords: "id, sourceExportId"
      })
      .upgrade(async (tx) => {
        await tx
          .table("groups")
          .toCollection()
          .modify((group: { carNumber?: unknown; worker1Name?: unknown; worker2Name?: unknown }) => {
            if (group.carNumber === undefined) group.carNumber = null;
            if (group.worker1Name === undefined) group.worker1Name = "";
            if (group.worker2Name === undefined) group.worker2Name = "";
          });
      });

    // Version 6: moves carNumber/worker1Name/worker2Name onto GroupPeriod
    // itself (backfilled to null/"" for any period created between v5 and
    // this version) - a group's assigned car/crew can change over time,
    // and each period needs to remember its OWN car/crew independent of
    // later changes to the group. Also adds LoadingList.groupId (a
    // loading list can now be created by picking a group directly,
    // instead of always typing a free-text title) - not indexed (no
    // "list by group" query yet), so a plain backfill.
    this.version(6).upgrade(async (tx) => {
      await tx
        .table("groupPeriods")
        .toCollection()
        .modify((period: { carNumber?: unknown; worker1Name?: unknown; worker2Name?: unknown }) => {
          if (period.carNumber === undefined) period.carNumber = null;
          if (period.worker1Name === undefined) period.worker1Name = "";
          if (period.worker2Name === undefined) period.worker2Name = "";
        });
      await tx
        .table("loadingLists")
        .toCollection()
        .modify((list: { groupId?: unknown }) => {
          if (list.groupId === undefined) {
            list.groupId = null;
          }
        });
    });

    // Version 7: adds LoadingList.loadingDate - once set, the list shows
    // up as a job-like card on the Jobs page for that date - not indexed
    // (no "loading lists by date" query yet), so a plain backfill.
    this.version(7).upgrade(async (tx) => {
      await tx
        .table("loadingLists")
        .toCollection()
        .modify((list: { loadingDate?: unknown }) => {
          if (list.loadingDate === undefined) {
            list.loadingDate = null;
          }
        });
    });

    // Version 8: adds LoadingList.mapsLink - a tappable Google Maps link,
    // same pre-normalized-URL pattern as Client.googleMapsLink - not
    // indexed, so a plain backfill.
    this.version(8).upgrade(async (tx) => {
      await tx
        .table("loadingLists")
        .toCollection()
        .modify((list: { mapsLink?: unknown }) => {
          if (list.mapsLink === undefined) {
            list.mapsLink = "";
          }
        });
    });
  }
}

/** Shared singleton instance used by the app at runtime. Tests construct
 * their own AppDatabase instance (with a unique name) instead of importing
 * this, so tests never share state with each other or with dev data. */
export const db = new AppDatabase();
