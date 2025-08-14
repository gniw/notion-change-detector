import { beforeEach, describe, expect, it, } from "vitest";
import { type DatabaseChanges, NotionDiffer, } from "../../src/notion/differ";

describe("NotionDiffer", () => {
  let differ: NotionDiffer;

  beforeEach(() => {
    differ = new NotionDiffer();
  });

  describe("detectPageChanges", () => {
    const databaseId = "test-db-123";
    const databaseName = "Test Database";

    it("新規ページを正しく検出する", () => {
      const previousPages = [{ id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" }];
      const currentPages = [
        { id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" },
        { id: "page-2", last_edited_time: "2025-01-02T00:00:00.000Z" },
      ];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        id: "page-2",
        title: "page-2", // デフォルトタイトル
        changeType: "added",
        last_edited_time: "2025-01-02T00:00:00.000Z",
      });
      expect(result.summary.added).toBe(1);
      expect(result.summary.updated).toBe(0);
      expect(result.summary.deleted).toBe(0);
    });

    it("更新されたページを正しく検出する（last_edited_time変更）", () => {
      const previousPages = [{ id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" }];
      const currentPages = [{ id: "page-1", last_edited_time: "2025-01-01T12:00:00.000Z" }];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        id: "page-1",
        title: "page-1",
        changeType: "updated",
        last_edited_time: "2025-01-01T12:00:00.000Z",
        previous_time: "2025-01-01T00:00:00.000Z",
      });
      expect(result.changes[0].propertyChanges).toEqual([]);
      expect(result.summary.updated).toBe(1);
    });

    it("プロパティが変更されたページを正しく検出する", () => {
      const previousPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Old Title",
          Status: "In Progress"
        }
      }];
      const currentPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z", // 同じ時刻
        properties: {
          Name: "New Title", // タイトル変更
          Status: "In Progress"
        }
      }];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        id: "page-1",
        title: "New Title", // 新しいタイトルが取得される
        changeType: "updated",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        previous_time: "2025-01-01T00:00:00.000Z",
        propertyChanges: [{
          propertyName: "Name",
          previousValue: "Old Title",
          currentValue: "New Title"
        }]
      });
      expect(result.summary.updated).toBe(1);
    });

    it("プロパティが追加されたページを正しく検出する", () => {
      const previousPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page"
        }
      }];
      const currentPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page",
          Status: "New" // 新しいプロパティ
        }
      }];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].changeType).toBe("updated");
      expect(result.changes[0]).toMatchObject({
        propertyChanges: [{
          propertyName: "Status",
          previousValue: undefined,
          currentValue: "New"
        }]
      });
      expect(result.summary.updated).toBe(1);
    });

    it("プロパティに変更がない場合は検出しない", () => {
      const pages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page",
          Status: "Active"
        }
      }];

      const result = differ.detectPageChanges(pages, pages, databaseId, databaseName);

      expect(result.changes).toHaveLength(0);
      expect(result.summary.updated).toBe(0);
    });

    it("追加されたページのプロパティを記録する", () => {
      const previousPages = [{ id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" }];
      const currentPages = [
        { id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" },
        { 
          id: "page-2", 
          last_edited_time: "2025-01-02T00:00:00.000Z",
          properties: {
            Name: "New Page Title",
            Status: "Draft",
            Priority: 1,
            Tags: ["new", "important"]
          }
        },
      ];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toMatchObject({
        id: "page-2",
        title: "New Page Title", // Nameプロパティから取得
        changeType: "added",
        last_edited_time: "2025-01-02T00:00:00.000Z",
        initialProperties: {
          Name: "New Page Title",
          Status: "Draft", 
          Priority: 1,
          Tags: ["new", "important"]
        }
      });
      expect(result.summary.added).toBe(1);
    });

    it("削除されたページを正しく検出する", () => {
      const previousPages = [
        { id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" },
        { id: "page-2", last_edited_time: "2025-01-02T00:00:00.000Z" },
      ];
      const currentPages = [{ id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" }];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        id: "page-2",
        title: "page-2",
        changeType: "deleted",
        last_edited_time: "2025-01-02T00:00:00.000Z",
      });
      expect(result.summary.deleted).toBe(1);
    });

    it("削除されたページのNameプロパティを使用してタイトルを表示する", () => {
      const previousPages = [
        { 
          id: "page-1", 
          last_edited_time: "2025-01-01T00:00:00.000Z",
          properties: {
            Name: "重要なタスク",
            Status: "完了"
          }
        },
        { 
          id: "page-2", 
          last_edited_time: "2025-01-02T00:00:00.000Z",
          properties: {
            Name: "削除されたページ",
            Description: "このページは削除されました"
          }
        },
      ];
      const currentPages = [{ 
        id: "page-1", 
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "重要なタスク",
          Status: "完了"
        }
      }];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        id: "page-2",
        title: "削除されたページ", // Nameプロパティから取得
        changeType: "deleted",
        last_edited_time: "2025-01-02T00:00:00.000Z",
      });
      expect(result.summary.deleted).toBe(1);
    });

    it("複数の変更タイプを同時に検出する", () => {
      const previousPages = [
        { id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" },
        { id: "page-2", last_edited_time: "2025-01-02T00:00:00.000Z" },
        { id: "page-3", last_edited_time: "2025-01-03T00:00:00.000Z" },
      ];
      const currentPages = [
        { id: "page-1", last_edited_time: "2025-01-01T12:00:00.000Z" }, // 更新
        { id: "page-4", last_edited_time: "2025-01-04T00:00:00.000Z" }, // 新規
        // page-2, page-3 は削除
      ];

      const result = differ.detectPageChanges(
        previousPages,
        currentPages,
        databaseId,
        databaseName,
      );

      expect(result.changes).toHaveLength(4); // 1更新 + 1新規 + 2削除
      expect(result.summary).toEqual({
        added: 1,
        updated: 1,
        deleted: 2,
      });

      const changeTypes = result.changes.map((c) => c.changeType).sort();
      expect(changeTypes).toEqual(["added", "deleted", "deleted", "updated"]);
    });

    it("変更がない場合は空の結果を返す", () => {
      const pages = [{ id: "page-1", last_edited_time: "2025-01-01T00:00:00.000Z" }];

      const result = differ.detectPageChanges(pages, pages, databaseId, databaseName);

      expect(result.changes).toHaveLength(0);
      expect(result.summary).toEqual({
        added: 0,
        updated: 0,
        deleted: 0,
      });
    });

    it("空のページリストを正しく処理する", () => {
      const result = differ.detectPageChanges([], [], databaseId, databaseName);

      expect(result.changes).toHaveLength(0);
      expect(result.databaseId).toBe(databaseId);
      expect(result.databaseName).toBe(databaseName);
    });
  });

  describe("extractPageTitle", () => {
    it("PropertyExtractor変換後のページからタイトルを抽出する", () => {
      const pageWithTitle = {
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page Title",
        },
      };

      const title = differ.extractPageTitle(pageWithTitle);
      expect(title).toBe("Test Page Title");
    });

    it("Titleプロパティからタイトルを抽出する", () => {
      const pageWithTitle = {
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Title: "Another Title",
        },
      };

      const title = differ.extractPageTitle(pageWithTitle);
      expect(title).toBe("Another Title");
    });

    it("タイトルが見つからない場合はページIDを返す", () => {
      const pageWithoutTitle = {
        id: "page-without-title",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {},
      };

      const title = differ.extractPageTitle(pageWithoutTitle);
      expect(title).toBe("page-without-title");
    });

    it("プロパティが存在しない場合はページIDを返す", () => {
      const pageWithoutProperties = {
        id: "page-no-props",
        last_edited_time: "2025-01-01T00:00:00.000Z",
      };

      const title = differ.extractPageTitle(pageWithoutProperties);
      expect(title).toBe("page-no-props");
    });
  });

  describe("property change tracking", () => {
    it("複数のプロパティが変更された場合を検出する", () => {
      const previousPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Old Title",
          Status: "Draft",
          Priority: 1
        }
      }];
      const currentPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "New Title",
          Status: "Published", 
          Priority: 1 // 変更なし
        }
      }];

      const result = differ.detectPageChanges(previousPages, currentPages, "db-1", "Test DB");
      
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].propertyChanges).toEqual([
        { propertyName: "Name", previousValue: "Old Title", currentValue: "New Title" },
        { propertyName: "Status", previousValue: "Draft", currentValue: "Published" }
      ]);
    });

    it("プロパティが削除された場合を検出する", () => {
      const previousPages = [{
        id: "page-1", 
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page",
          Status: "Active",
          TempField: "temporary"
        }
      }];
      const currentPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z", 
        properties: {
          Name: "Test Page",
          Status: "Active"
          // TempFieldが削除
        }
      }];

      const result = differ.detectPageChanges(previousPages, currentPages, "db-1", "Test DB");
      
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].propertyChanges).toEqual([
        { propertyName: "TempField", previousValue: "temporary", currentValue: undefined }
      ]);
    });

    it("配列プロパティの変更を検出する", () => {
      const previousPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page",
          Tags: ["tag1", "tag2"]
        }
      }];
      const currentPages = [{
        id: "page-1",
        last_edited_time: "2025-01-01T00:00:00.000Z",
        properties: {
          Name: "Test Page", 
          Tags: ["tag1", "tag2", "tag3"]
        }
      }];

      const result = differ.detectPageChanges(previousPages, currentPages, "db-1", "Test DB");
      
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].propertyChanges).toEqual([
        { propertyName: "Tags", previousValue: ["tag1", "tag2"], currentValue: ["tag1", "tag2", "tag3"] }
      ]);
    });
  });

  describe("hasChanges", () => {
    it("変更があるDatabaseChangesでtrueを返す", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test DB",
        changes: [
          {
            id: "page-1",
            title: "Page 1",
            changeType: "added",
            last_edited_time: "2025-01-01T00:00:00.000Z",
          },
        ],
        summary: { added: 1, updated: 0, deleted: 0 },
      };

      expect(differ.hasChanges(changes)).toBe(true);
    });

    it("変更がないDatabaseChangesでfalseを返す", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test DB",
        changes: [],
        summary: { added: 0, updated: 0, deleted: 0 },
      };

      expect(differ.hasChanges(changes)).toBe(false);
    });
  });

  describe("getTotalChangeCount", () => {
    it("総変更数を正しく計算する", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test DB",
        changes: [],
        summary: { added: 3, updated: 2, deleted: 1 },
      };

      expect(differ.getTotalChangeCount(changes)).toBe(6);
    });

    it("変更がない場合は0を返す", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test DB",
        changes: [],
        summary: { added: 0, updated: 0, deleted: 0 },
      };

      expect(differ.getTotalChangeCount(changes)).toBe(0);
    });
  });
});
