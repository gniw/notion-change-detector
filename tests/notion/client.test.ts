import { Client } from "@notionhq/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotionClient } from "../../src/notion/client";

// Notion APIクライアントをモック
vi.mock("@notionhq/client");
const MockedClient = vi.mocked(Client);

describe("NotionClient", () => {
  let notionClient: NotionClient;
  const mockUsersMe = vi.fn();
  const mockApiKey = "secret_test_api_key_123";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NOTION_API_KEY = mockApiKey;

    // モッククライアントの設定
    MockedClient.mockImplementation(
      () =>
        ({
          users: {
            me: mockUsersMe,
          },
        }) as NotionClient,
    );
  });

  describe("constructor", () => {
    it("環境変数のAPIキーでクライアントを作成できる", () => {
      notionClient = new NotionClient();
      expect(notionClient).toBeDefined();
    });

    it("APIキーが未設定の場合はエラーを投げる", () => {
      delete process.env.NOTION_API_KEY;
      expect(() => new NotionClient()).toThrow("NOTION_API_KEY environment variable is required");
    });

    it("指定されたAPIキーでクライアントを作成できる", () => {
      const customApiKey = "custom_api_key";
      notionClient = new NotionClient(customApiKey);
      expect(notionClient).toBeDefined();
    });
  });

  describe("isConnected", () => {
    beforeEach(() => {
      notionClient = new NotionClient();
    });

    it("初期状態では未接続を返す", () => {
      expect(notionClient.isConnected()).toBe(false);
    });

    it("接続テスト成功後は接続済みを返す", async () => {
      // 接続成功をモック
      mockUsersMe.mockResolvedValue({ object: "user", id: "test-user-id" });

      await notionClient.testConnection();
      expect(notionClient.isConnected()).toBe(true);
    });
  });

  describe("testConnection", () => {
    beforeEach(() => {
      notionClient = new NotionClient();
    });

    it("有効なAPIキーの場合はtrueを返す", async () => {
      // 成功レスポンスをモック
      mockUsersMe.mockResolvedValue({ object: "user", id: "test-user-id" });

      const result = await notionClient.testConnection();
      expect(result).toBe(true);
      expect(mockUsersMe).toHaveBeenCalledTimes(1);
    });

    it("無効なAPIキーの場合はfalseを返す", async () => {
      // APIエラーをモック
      mockUsersMe.mockRejectedValue(new Error("unauthorized"));

      const result = await notionClient.testConnection();
      expect(result).toBe(false);
    });

    it("ネットワークエラーを適切に処理する", async () => {
      // ネットワークエラーをモック
      mockUsersMe.mockRejectedValue(new Error("Network Error"));

      const result = await notionClient.testConnection();
      expect(result).toBe(false);
    });
  });
});
