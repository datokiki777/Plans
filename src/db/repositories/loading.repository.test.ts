import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { AppDatabase } from "@/db/database";
import { LocalLoadingRepository } from "@/db/repositories/loading.repository";

describe("LocalLoadingRepository", () => {
  let testDb: AppDatabase;
  let repo: LocalLoadingRepository;

  beforeEach(() => {
    testDb = new AppDatabase(`test-${crypto.randomUUID()}`);
    repo = new LocalLoadingRepository(testDb);
  });

  afterEach(async () => {
    testDb.close();
    await testDb.delete();
  });

  it("creates a list and items, listItems returns them sorted by sortOrder", async () => {
    const list = await repo.createList({ title: "სია A" });
    await repo.addItem({ loadingListId: list.id, category: "panels", name: "პანელი 1" });
    await repo.addItem({ loadingListId: list.id, category: "panels", name: "პანელი 2" });
    const items = await repo.listItems(list.id);
    expect(items.map((i) => i.name)).toEqual(["პანელი 1", "პანელი 2"]);
  });

  it("listLists() (the default, no-search view) returns created lists, newest first, excluding archived", async () => {
    // Regression test: listLists() previously called .orderBy("createdAt"),
    // but createdAt is not part of the loadingLists Dexie index, which
    // made the query reject and left the default Loading screen showing
    // "no lists found" even though lists existed (searchLists(), a plain
    // scan, found them fine - which is how the bug was noticed).
    const a = await repo.createList({ title: "108" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await repo.createList({ title: "876" });
    const archived = await repo.createList({ title: "დაარქივებული" });
    await repo.archiveList(archived.id);

    const lists = await repo.listLists();
    expect(lists.map((l) => l.id)).toEqual([b.id, a.id]);
    expect(lists.map((l) => l.id)).not.toContain(archived.id);
  });

  it("listLists({ includeArchived: true }) includes archived lists too", async () => {
    const archived = await repo.createList({ title: "დაარქივებული" });
    await repo.archiveList(archived.id);
    const lists = await repo.listLists({ includeArchived: true });
    expect(lists.map((l) => l.id)).toContain(archived.id);
  });

  it("archiveList/restoreList round-trips archivedAt", async () => {
    const list = await repo.createList({ title: "სია" });
    await repo.archiveList(list.id);
    expect((await repo.getList(list.id))?.archivedAt).not.toBeNull();
    await repo.restoreList(list.id);
    expect((await repo.getList(list.id))?.archivedAt).toBeNull();
  });

  it("createList defaults specialNote to empty string, setSpecialNote updates it", async () => {
    const list = await repo.createList({ title: "სია" });
    expect(list.specialNote).toBe("");

    await repo.setSpecialNote(list.id, "საჭიროა ავტოამწე");
    expect((await repo.getList(list.id))?.specialNote).toBe("საჭიროა ავტოამწე");
  });

  it("duplicateList copies title (with suffix) and all items into a new list", async () => {
    const original = await repo.createList({ title: "ორიგინალი", specialNote: "მნიშვნელოვანი შენიშვნა" });
    await repo.addItem({ loadingListId: original.id, category: "glass", note: "შუშა 100სმ", doorInfo: "PK90" });
    await repo.addItem({ loadingListId: original.id, category: "extras", name: "დამატება", quantity: "2" });

    const copy = await repo.duplicateList(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toContain("ორიგინალი");
    expect(copy.specialNote).toBe("მნიშვნელოვანი შენიშვნა");

    const copiedItems = await repo.listItems(copy.id);
    expect(copiedItems).toHaveLength(2);
    expect(copiedItems.every((i) => i.loadingListId === copy.id)).toBe(true);
    expect(await repo.listItems(original.id)).toHaveLength(2);
  });

  it("deleteList also deletes its items (no orphans)", async () => {
    const list = await repo.createList({ title: "სია" });
    await repo.addItem({ loadingListId: list.id, category: "trays", note: "თასი" });
    await repo.deleteList(list.id);
    expect(await repo.listItems(list.id)).toHaveLength(0);
  });

  it("searchLists matches by title, excludes archived", async () => {
    await repo.createList({ title: "გიორგის სახლი" });
    const archived = await repo.createList({ title: "გიორგის ბინა" });
    await repo.archiveList(archived.id);

    const results = await repo.searchLists("გიორგი");
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("გიორგის სახლი");
  });
});
