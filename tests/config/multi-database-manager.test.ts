import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from '@notionhq/client';
import { DatabaseConfigManager } from "../../scripts/notion/config/database-config-manager";
import { MultiDatabaseManager } from "../../scripts/notion/config/multi-database-manager";
import { NotionClient } from "../../scripts/notion/notion/client";
import { NotionDatabase } from "../../scripts/notion/notion/database";
import { StateManager } from "../../scripts/notion/storage/state-manager";

// 依存モジュールをモック
vi.mock("../../scripts/notion/config/database-config-manager");
vi.mock("../../scripts/notion/notion/client");
vi.mock("../../scripts/notion/notion/database");
vi.mock("../../scripts/notion/storage/state-manager");

const MockedDatabaseConfigManager = vi.mocked(DatabaseConfigManager);
const MockedNotionClient = vi.mocked(NotionClient);
const MockedNotionDatabase = vi.mocked(NotionDatabase);
const MockedStateManager = vi.mocked(StateManager);

import type { DatabasesConfig } from "../../scripts/notion/config/database-config-manager";

type MockedDatabaseConfigManagerType = {
  loadConfig: vi.Mock<[], Promise<DatabasesConfig>>;
  getEnabledDatabases: vi.Mock<[], Promise<DatabaseConfig[]>>;
  getDatabaseById: vi.Mock<[string], Promise<DatabaseConfig | null>>;
  getAllDatabases: vi.Mock<[], Promise<DatabaseConfig[]>>;
};

type MockedNotionClientType = {
  isConnected: vi.Mock<[], boolean>;
  testConnection: vi.Mock<[], Promise<boolean>>;
  getClient: vi.Mock<[], Client>;
};

describe("MultiDatabaseManager", () => {
  let multiManager: MultiDatabaseManager;
  let mockConfigManager: MockedDatabaseConfigManagerType;
  let mockClient: MockedNotionClientType;
  const mockDatabases = [
    { id: "db-1", name: "DB 1", description: "desc1", enabled: true },
    { id: "db-2", name: "DB 2", description: "desc2", enabled: true },
    { id: "db-3", name: "DB 3", description: "desc3", enabled: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // モッククライアントの設定
    mockClient = {
      isConnected: vi.fn<[], boolean>().mockReturnValue(true),
      testConnection: vi.fn<[], Promise<boolean>>().mockResolvedValue(true),
      getClient: vi.fn().mockReturnValue({
        databases: {
          retrieve: vi.fn(),
          query: vi.fn(),
        },
      }),
    };
    MockedNotionClient.mockImplementation(() => mockClient);

    // モック設定マネージャーの設定
    mockConfigManager = {
      loadConfig: vi.fn<[], Promise<DatabasesConfig>>().mockResolvedValue({ databases: mockDatabases }),
      getEnabledDatabases: vi.fn<[], Promise<DatabaseConfig[]>>().mockResolvedValue(mockDatabases.filter((db) => db.enabled)),
      getDatabaseById: vi.fn<[string], Promise<DatabaseConfig | null>>(),
      getAllDatabases: vi.fn<[], Promise<DatabaseConfig[]>>().mockResolvedValue(mockDatabases),
    };
    MockedDatabaseConfigManager.mockImplementation(() => mockConfigManager);

    // モックNotionDatabaseの設定
    MockedNotionDatabase.mockImplementation(() => ({
      getDatabaseInfo: vi.fn(),
      getPages: vi.fn(),
      getDatabaseId: vi.fn(),
    }));

    // モックStateManagerの設定
    MockedStateManager.mockImplementation(() => ({
      saveState: vi.fn(),
      loadState: vi.fn(),
      hasState: vi.fn(),
      deleteState: vi.fn(),
      getStateFilePath: vi.fn(),
    }));

    multiManager = new MultiDatabaseManager();
  });

  describe("constructor", () => {
    it("デフォルト設定でインスタンスを作成できる", () => {
      expect(multiManager).toBeDefined();
    });

    it("カスタム設定でインスタンスを作成できる", () => {
      const customManager = new MultiDatabaseManager("./custom-config.json");
      expect(customManager).toBeDefined();
    });
  });

  describe("initialize", () => {
    it("設定を読み込んで初期化できる", async () => {
      await multiManager.initialize();

      expect(mockConfigManager.loadConfig).toHaveBeenCalledTimes(1);
      expect(MockedNotionClient).toHaveBeenCalledTimes(1);
    });

    it("初期化済みの場合は再実行しない", async () => {
      await multiManager.initialize();
      await multiManager.initialize();

      expect(mockConfigManager.loadConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("getEnabledDatabases", () => {
    it("有効化されたデータベース情報を返す", async () => {
      await multiManager.initialize();

      const result = await multiManager.getEnabledDatabases();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("db-1");
      expect(result[1].id).toBe("db-2");
    });

    it("初期化されていない場合は自動的に初期化する", async () => {
      const result = await multiManager.getEnabledDatabases();

      expect(mockConfigManager.loadConfig).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("getDatabaseManager", () => {
    it("指定されたIDのデータベースマネージャーを返す", async () => {
      await multiManager.initialize();
      mockConfigManager.getDatabaseById.mockResolvedValue(mockDatabases[0]);

      const result = await multiManager.getDatabaseManager("db-1");

      expect(result).toBeDefined();
      expect(MockedNotionDatabase).toHaveBeenCalledWith(mockClient, "db-1");
    });

    it("存在しないIDの場合はnullを返す", async () => {
      await multiManager.initialize();
      mockConfigManager.getDatabaseById.mockResolvedValue(null);

      const result = await multiManager.getDatabaseManager("non-existent");

      expect(result).toBeNull();
    });

    it("無効化されたデータベースの場合はnullを返す", async () => {
      await multiManager.initialize();
      mockConfigManager.getDatabaseById.mockResolvedValue(mockDatabases[2]); // enabled: false

      const result = await multiManager.getDatabaseManager("db-3");

      expect(result).toBeNull();
    });
  });

  describe("getStateManager", () => {
    it("指定されたIDの状態マネージャーを返す", async () => {
      await multiManager.initialize();
      mockConfigManager.getDatabaseById.mockResolvedValue(mockDatabases[0]);

      const result = await multiManager.getStateManager("db-1");

      expect(result).toBeDefined();
      expect(MockedStateManager).toHaveBeenCalledWith("./state", "db-1");
    });

    it("存在しないIDの場合はnullを返す", async () => {
      await multiManager.initialize();
      mockConfigManager.getDatabaseById.mockResolvedValue(null);

      const result = await multiManager.getStateManager("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getAllDatabaseInfo", () => {
    it("有効な全てのデータベースの情報を取得する", async () => {
      await multiManager.initialize();

      const mockDbInfo1 = { id: "db-1", title: [{ plain_text: "DB 1" }] };
      const mockDbInfo2 = { id: "db-2", title: [{ plain_text: "DB 2" }] };

      const mockDb1 = { getDatabaseInfo: vi.fn().mockResolvedValue(mockDbInfo1) };
      const mockDb2 = { getDatabaseInfo: vi.fn().mockResolvedValue(mockDbInfo2) };

      MockedNotionDatabase.mockImplementationOnce(() => mockDb1 as NotionDatabase).mockImplementationOnce(
        () => mockDb2 as NotionDatabase,
      );

      const result = await multiManager.getAllDatabaseInfo();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ config: mockDatabases[0], info: mockDbInfo1 });
      expect(result[1]).toEqual({ config: mockDatabases[1], info: mockDbInfo2 });
    });

    it("一部のデータベースが取得できない場合は取得できたもののみを返す", async () => {
      await multiManager.initialize();

      const mockDbInfo1 = { id: "db-1", title: [{ plain_text: "DB 1" }] };
      const mockDb1 = { getDatabaseInfo: vi.fn().mockResolvedValue(mockDbInfo1) };
      const mockDb2 = { getDatabaseInfo: vi.fn().mockResolvedValue(null) };

      MockedNotionDatabase.mockImplementationOnce(() => mockDb1 as NotionDatabase).mockImplementationOnce(
        () => mockDb2 as NotionDatabase,
      );

      const result = await multiManager.getAllDatabaseInfo();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ config: mockDatabases[0], info: mockDbInfo1 });
    });
  });

  describe("testConnection", () => {
    it("Notion APIへの接続テストを実行する", async () => {
      const result = await multiManager.testConnection();

      expect(result).toBe(true);
      expect(mockClient.testConnection).toHaveBeenCalledTimes(1);
    });
  });
});
