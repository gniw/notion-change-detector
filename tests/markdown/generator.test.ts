import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, } from "vitest";
import { type GenerationOptions, MarkdownGenerator } from "../../src/markdown/generator";
import type { DatabaseChanges, PageChange } from "../../src/notion/differ";

describe("MarkdownGenerator", () => {
  let generator: MarkdownGenerator;
  const testReportsDir = "./test-reports";

  beforeEach(() => {
    generator = new MarkdownGenerator();
  });

  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe("generateDatabaseMarkdown", () => {
    it("単一データベースの変更をマークダウン形式で出力する", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test Database",
        changes: [
          {
            id: "page-1",
            title: "New Page",
            changeType: "added",
            last_edited_time: "2025-01-02T00:00:00.000Z",
          },
          {
            id: "page-2",
            title: "Updated Page",
            changeType: "updated",
            last_edited_time: "2025-01-02T12:00:00.000Z",
            previous_time: "2025-01-01T00:00:00.000Z",
          },
        ],
        summary: { added: 1, updated: 1, deleted: 0 },
      };

      const result = generator.generateDatabaseMarkdown(changes);

      expect(result).toContain("## Test Database");
      expect(result).toContain("**追加: 1件, 更新: 1件, 削除: 0件**");
      expect(result).toContain("### 📝 追加されたページ (1件)");
      expect(result).toContain("- [New Page](https://notion.so/page-1)");
      expect(result).toContain("### 🔄 更新されたページ (1件)");
      expect(result).toContain("- [Updated Page](https://notion.so/page-2)");
      expect(result).not.toContain("### 🗑️ 削除されたページ");
    });

    it("削除されたページも含む変更を出力する", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test Database",
        changes: [
          {
            id: "page-3",
            title: "Deleted Page",
            changeType: "deleted",
            last_edited_time: "2025-01-01T00:00:00.000Z",
          },
        ],
        summary: { added: 0, updated: 0, deleted: 1 },
      };

      const result = generator.generateDatabaseMarkdown(changes);

      expect(result).toContain("### 🗑️ 削除されたページ (1件)");
      expect(result).toContain("- [Deleted Page](https://notion.so/page-3)");
    });

    it("変更がない場合は適切なメッセージを表示する", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test Database",
        changes: [],
        summary: { added: 0, updated: 0, deleted: 0 },
      };

      const result = generator.generateDatabaseMarkdown(changes);

      expect(result).toContain("## Test Database");
      expect(result).toContain("**変更なし**");
      expect(result).not.toContain("### ");
    });

    it("タイムスタンプを含むオプションで詳細情報を出力する", () => {
      const changes: DatabaseChanges = {
        databaseId: "db-1",
        databaseName: "Test Database",
        changes: [
          {
            id: "page-1",
            title: "Updated Page",
            changeType: "updated",
            last_edited_time: "2025-01-02T12:00:00.000Z",
            previous_time: "2025-01-01T00:00:00.000Z",
          },
        ],
        summary: { added: 0, updated: 1, deleted: 0 },
      };

      const options: GenerationOptions = { includeTimestamps: true };
      const result = generator.generateDatabaseMarkdown(changes, options);

      expect(result).toContain("最終編集: 2025-01-02T12:00:00.000Z");
      expect(result).toContain("前回: 2025-01-01T00:00:00.000Z");
    });
  });

  describe("generateSummaryMarkdown", () => {
    it("複数データベースの変更サマリーを生成する", () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Database One",
          changes: [
            {
              id: "p1",
              title: "Page 1",
              changeType: "added",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
            {
              id: "p2",
              title: "Page 2",
              changeType: "updated",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 1, updated: 1, deleted: 0 },
        },
        {
          databaseId: "db-2",
          databaseName: "Database Two",
          changes: [
            {
              id: "p3",
              title: "Page 3",
              changeType: "deleted",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 0, updated: 0, deleted: 1 },
        },
      ];

      const result = generator.generateSummaryMarkdown(allChanges);

      expect(result).toContain("# Notion データベース変更レポート");
      expect(result).toContain("## 📊 全体サマリー");
      expect(result).toContain("- **追加**: 1件");
      expect(result).toContain("- **更新**: 1件");
      expect(result).toContain("- **削除**: 1件");
      expect(result).toContain("- **合計変更数**: 3件");
      expect(result).toContain("| Database One | 1 | 1 | 0 | 2 |");
      expect(result).toContain("| Database Two | 0 | 0 | 1 | 1 |");
    });

    it("変更がない場合のサマリーを生成する", () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Database One",
          changes: [],
          summary: { added: 0, updated: 0, deleted: 0 },
        },
      ];

      const result = generator.generateSummaryMarkdown(allChanges);

      expect(result).toContain("変更がありませんでした");
      expect(result).toContain("| Database One | 0 | 0 | 0 | 0 |");
    });

    it("空の配列の場合のサマリーを生成する", () => {
      const result = generator.generateSummaryMarkdown([]);

      expect(result).toContain("# Notion データベース変更レポート");
      expect(result).toContain("変更がありませんでした");
      expect(result).not.toContain("|"); // テーブルは表示されない
    });

    it("カスタム日付でレポートを生成する", () => {
      const allChanges: DatabaseChanges[] = [];
      const options: GenerationOptions = {
        reportDate: new Date("2025-01-15T10:30:00.000Z"),
      };

      const result = generator.generateSummaryMarkdown(allChanges, options);

      expect(result).toContain("**レポート生成日時**: 2025-01-15T10:30:00.000Z");
    });
  });

  describe("generateFullMarkdown", () => {
    it("完全なレポートを生成する（サマリー + 詳細）", () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Test Database",
          changes: [
            {
              id: "p1",
              title: "New Page",
              changeType: "added",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 1, updated: 0, deleted: 0 },
        },
      ];

      const result = generator.generateFullMarkdown(allChanges);

      expect(result).toContain("# Notion データベース変更レポート");
      expect(result).toContain("## 📊 全体サマリー");
      expect(result).toContain("## 📋 データベース詳細");
      expect(result).toContain("### Test Database");
      expect(result).toContain("- [New Page](https://notion.so/p1)");
    });

    it("変更がないデータベースは詳細に含めない", () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Changed Database",
          changes: [
            {
              id: "p1",
              title: "New Page",
              changeType: "added",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 1, updated: 0, deleted: 0 },
        },
        {
          databaseId: "db-2",
          databaseName: "Unchanged Database",
          changes: [],
          summary: { added: 0, updated: 0, deleted: 0 },
        },
      ];

      const result = generator.generateFullMarkdown(allChanges);

      expect(result).toContain("### Changed Database");
      expect(result).not.toContain("### Unchanged Database");
    });
  });

  describe("formatPageLink", () => {
    it("NotionページのリンクをMarkdown形式でフォーマットする", () => {
      const pageChange: PageChange = {
        id: "abc-123-def",
        title: "My Page Title",
        changeType: "added",
        last_edited_time: "2025-01-01T00:00:00.000Z",
      };

      const result = generator.formatPageLink(pageChange);

      expect(result).toBe("[My Page Title](https://notion.so/abc-123-def)");
    });

    it("タイトルにMarkdown特殊文字が含まれている場合にエスケープする", () => {
      const pageChange: PageChange = {
        id: "page-id",
        title: "Title with [brackets] and *asterisks*",
        changeType: "added",
        last_edited_time: "2025-01-01T00:00:00.000Z",
      };

      const result = generator.formatPageLink(pageChange);

      expect(result).toBe(
        "[Title with \\[brackets\\] and \\*asterisks\\*](https://notion.so/page-id)",
      );
    });
  });

  describe("calculateTotalChanges", () => {
    it("複数データベースの変更数を合計する", () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "DB 1",
          changes: [],
          summary: { added: 2, updated: 1, deleted: 0 },
        },
        {
          databaseId: "db-2",
          databaseName: "DB 2",
          changes: [],
          summary: { added: 0, updated: 3, deleted: 2 },
        },
      ];

      const result = generator.calculateTotalChanges(allChanges);

      expect(result).toEqual({
        added: 2,
        updated: 4,
        deleted: 2,
        total: 8,
      });
    });

    it("空の配列の場合はゼロを返す", () => {
      const result = generator.calculateTotalChanges([]);

      expect(result).toEqual({
        added: 0,
        updated: 0,
        deleted: 0,
        total: 0,
      });
    });
  });

  describe("saveReportToFile", () => {
    it("マークダウンレポートをファイルに保存する", async () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Test Database",
          changes: [
            {
              id: "p1",
              title: "New Page",
              changeType: "added",
              last_edited_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 1, updated: 0, deleted: 0 },
        },
      ];

      const filePath = path.join(testReportsDir, "test-report.md");
      await generator.saveReportToFile(allChanges, filePath);

      const savedContent = await fs.readFile(filePath, "utf-8");
      expect(savedContent).toContain("# Notion データベース変更レポート");
      expect(savedContent).toContain("## 📊 全体サマリー");
      expect(savedContent).toContain("### Test Database");
      expect(savedContent).toContain("- [New Page](https://notion.so/p1)");
    });

    it("指定したディレクトリが存在しない場合は作成する", async () => {
      const allChanges: DatabaseChanges[] = [];
      const deepDir = path.join(testReportsDir, "nested", "deep", "directory");
      const filePath = path.join(deepDir, "report.md");

      await generator.saveReportToFile(allChanges, filePath);

      expect(
        await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# Notion データベース変更レポート");
    });

    it("既存ファイルを上書きする", async () => {
      const filePath = path.join(testReportsDir, "overwrite-test.md");

      // 最初のファイルを作成
      const firstChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "First Database",
          changes: [],
          summary: { added: 0, updated: 0, deleted: 0 },
        },
      ];
      await generator.saveReportToFile(firstChanges, filePath);

      const firstContent = await fs.readFile(filePath, "utf-8");
      expect(firstContent).toContain("First Database");

      // ファイルを上書き
      const secondChanges: DatabaseChanges[] = [
        {
          databaseId: "db-2",
          databaseName: "Second Database",
          changes: [],
          summary: { added: 0, updated: 0, deleted: 0 },
        },
      ];
      await generator.saveReportToFile(secondChanges, filePath);

      const secondContent = await fs.readFile(filePath, "utf-8");
      expect(secondContent).toContain("Second Database");
      expect(secondContent).not.toContain("First Database");
    });

    it("カスタムオプションでファイルに保存する", async () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Test Database",
          changes: [
            {
              id: "p1",
              title: "Updated Page",
              changeType: "updated",
              last_edited_time: "2025-01-02T12:00:00.000Z",
              previous_time: "2025-01-01T00:00:00.000Z",
            },
          ],
          summary: { added: 0, updated: 1, deleted: 0 },
        },
      ];

      const filePath = path.join(testReportsDir, "custom-options.md");
      const options: GenerationOptions = {
        includeTimestamps: true,
        reportDate: new Date("2025-01-15T10:30:00.000Z"),
      };

      await generator.saveReportToFile(allChanges, filePath, options);

      const savedContent = await fs.readFile(filePath, "utf-8");
      expect(savedContent).toContain("**レポート生成日時**: 2025-01-15T10:30:00.000Z");
    });
  });

  describe("generateFileName", () => {
    it("デフォルトのファイル名を生成する", () => {
      const fileName = generator.generateFileName();

      expect(fileName).toMatch(/^notion-changes-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });

    it("カスタムプレフィックスでファイル名を生成する", () => {
      const fileName = generator.generateFileName("custom-report");

      expect(fileName).toMatch(/^custom-report-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });

    it("指定した日付でファイル名を生成する", () => {
      const date = new Date("2025-01-15T10:30:45.123Z");
      const fileName = generator.generateFileName("test", date);

      expect(fileName).toBe("test-2025-01-15-103045.md");
    });

    it("日付のみでファイル名を生成する（時刻なし）", () => {
      const date = new Date("2025-01-15T10:30:45.123Z");
      const fileName = generator.generateFileName("daily", date, false);

      expect(fileName).toBe("daily-2025-01-15.md");
    });
  });

  describe("saveReportWithAutoName", () => {
    it("自動生成されたファイル名でレポートを保存する", async () => {
      const allChanges: DatabaseChanges[] = [
        {
          databaseId: "db-1",
          databaseName: "Auto Name Test",
          changes: [],
          summary: { added: 0, updated: 0, deleted: 0 },
        },
      ];

      const savedFilePath = await generator.saveReportWithAutoName(allChanges, testReportsDir);

      expect(path.basename(savedFilePath)).toMatch(/^notion-changes-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
      expect(savedFilePath).toContain("test-reports");

      const content = await fs.readFile(savedFilePath, "utf-8");
      expect(content).toContain("Auto Name Test");
    });

    it("カスタムプレフィックスで自動保存する", async () => {
      const allChanges: DatabaseChanges[] = [];

      const savedFilePath = await generator.saveReportWithAutoName(allChanges, testReportsDir, {
        filePrefix: "daily-report",
      });

      expect(path.basename(savedFilePath)).toMatch(/^daily-report-\d{4}-\d{2}-\d{2}-\d{6}\.md$/);
    });
  });
});
