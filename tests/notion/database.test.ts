import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from '@notionhq/client';
import { NotionClient } from "../../src/notion/client";
import { NotionDatabase } from "../../src/notion/database";

// NotionClientをモック
vi.mock("../../src/notion/client");
const MockedNotionClient = vi.mocked(NotionClient);

describe("NotionDatabase", () => {
  let notionDatabase: NotionDatabase;
  let mockClient: {
    isConnected: vi.Mock<[], boolean>;
    testConnection: vi.Mock<[], Promise<boolean>>;
    getClient: vi.Mock<[], Client>;
  };
  const mockDatabaseId = "test-database-id-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // モッククライアントを設定
    mockClient = {
      isConnected: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getClient: vi.fn().mockReturnValue({
        databases: {
          retrieve: vi.fn(),
          query: vi.fn(),
        },
      }),
    };
    MockedNotionClient.mockImplementation(() => mockClient);

    // 環境変数を設定
    process.env.NOTION_DATABASE_ID = mockDatabaseId;
  });

  describe("constructor", () => {
    it("NotionClientとデータベースIDでインスタンスを作成できる", () => {
      const client = new NotionClient();
      notionDatabase = new NotionDatabase(client, mockDatabaseId);

      expect(notionDatabase).toBeDefined();
    });

    it("環境変数からデータベースIDを取得できる", () => {
      const client = new NotionClient();
      notionDatabase = new NotionDatabase(client);

      expect(notionDatabase).toBeDefined();
    });

    it("データベースIDが未設定の場合はエラーを投げる", () => {
      delete process.env.NOTION_DATABASE_ID;
      const client = new NotionClient();

      expect(() => new NotionDatabase(client)).toThrow("Database ID is required");
    });
  });

  describe("getDatabaseInfo", () => {
    beforeEach(() => {
      const client = new NotionClient();
      notionDatabase = new NotionDatabase(client, mockDatabaseId);
    });

    it("データベース情報を取得できる", async () => {
      // データベース情報のモックレスポンス
      const mockDatabaseInfo = {
        object: "database",
        id: mockDatabaseId,
        title: [{ plain_text: "Test Database" }],
        properties: {
          Name: { type: "title" },
          Status: { type: "select" },
        },
        last_edited_time: "2023-12-01T00:00:00.000Z",
      };

      mockClient.getClient().databases.retrieve.mockResolvedValue(mockDatabaseInfo);

      const result = await notionDatabase.getDatabaseInfo();

      expect(result).toEqual(mockDatabaseInfo);
      expect(mockClient.getClient().databases.retrieve).toHaveBeenCalledWith({
        database_id: mockDatabaseId,
      });
    });

    it("データベースが存在しない場合はnullを返す", async () => {
      mockClient.getClient().databases.retrieve.mockRejectedValue(new Error("Object not found"));

      const result = await notionDatabase.getDatabaseInfo();
      expect(result).toBeNull();
    });
  });

  describe("getPages", () => {
    beforeEach(() => {
      const client = new NotionClient();
      notionDatabase = new NotionDatabase(client, mockDatabaseId);
    });

    it("データベースの全ページを取得できる", async () => {
      const mockPages = {
        results: [
          {
            id: "page-1",
            object: "page",
            properties: { Name: { title: [{ plain_text: "Page 1" }] } },
            last_edited_time: "2023-12-01T00:00:00.000Z",
          },
          {
            id: "page-2",
            object: "page",
            properties: { Name: { title: [{ plain_text: "Page 2" }] } },
            last_edited_time: "2023-12-02T00:00:00.000Z",
          },
        ],
        has_more: false,
        next_cursor: null,
      };

      mockClient.getClient().databases.query.mockResolvedValue(mockPages);

      const result = await notionDatabase.getPages();

      expect(result).toEqual(mockPages.results);
      expect(mockClient.getClient().databases.query).toHaveBeenCalledWith({
        database_id: mockDatabaseId,
      });
    });

    it("ページネーション処理が正しく動作する", async () => {
      // 最初のページ
      const firstPage = {
        results: [{ id: "page-1", object: "page" }],
        has_more: true,
        next_cursor: "cursor-123",
      };

      // 2ページ目
      const secondPage = {
        results: [{ id: "page-2", object: "page" }],
        has_more: false,
        next_cursor: null,
      };

      mockClient
        .getClient()
        .databases.query.mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const result = await notionDatabase.getPages();

      expect(result).toHaveLength(2);
      expect(mockClient.getClient().databases.query).toHaveBeenCalledTimes(2);
      expect(mockClient.getClient().databases.query).toHaveBeenNthCalledWith(2, {
        database_id: mockDatabaseId,
        start_cursor: "cursor-123",
      });
    });

    it("フィルター条件を指定できる", async () => {
      const filter = {
        property: "Status",
        select: { equals: "Published" },
      };

      mockClient.getClient().databases.query.mockResolvedValue({ results: [], has_more: false });

      await notionDatabase.getPages({ filter });

      expect(mockClient.getClient().databases.query).toHaveBeenCalledWith({
        database_id: mockDatabaseId,
        filter,
      });
    });

    it("エラーが発生した場合は空配列を返す", async () => {
      mockClient.getClient().databases.query.mockRejectedValue(new Error("API Error"));

      const result = await notionDatabase.getPages();
      expect(result).toEqual([]);
    });
  });

  describe("getDatabaseId", () => {
    it("設定されたデータベースIDを返す", () => {
      const client = new NotionClient();
      notionDatabase = new NotionDatabase(client, mockDatabaseId);

      expect(notionDatabase.getDatabaseId()).toBe(mockDatabaseId);
    });
  });
});
