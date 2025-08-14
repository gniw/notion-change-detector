import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseConfigManager } from "../../src/config/database-config-manager";

// ファイルシステムをモック
vi.mock("fs/promises");
const mockedFs = vi.mocked(fs);

describe("DatabaseConfigManager", () => {
  let configManager: DatabaseConfigManager;
  const defaultConfigPath = "./notion-databases.json";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("デフォルトパスでインスタンスを作成できる", () => {
      configManager = new DatabaseConfigManager();
      expect(configManager).toBeDefined();
    });

    it("カスタムパスでインスタンスを作成できる", () => {
      const customPath = "./custom-config.json";
      configManager = new DatabaseConfigManager(customPath);
      expect(configManager).toBeDefined();
    });
  });

  describe("loadConfig", () => {
    const validConfig = {
      databases: [
        {
          id: "db-1",
          name: "Test DB 1",
          description: "テストデータベース1",
          enabled: true,
        },
        {
          id: "db-2",
          name: "Test DB 2",
          description: "テストデータベース2",
          enabled: false,
        },
      ],
    };

    beforeEach(() => {
      configManager = new DatabaseConfigManager();
    });

    it("有効な設定ファイルを読み込める", async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(validConfig));

      const result = await configManager.loadConfig();

      expect(result).toEqual(validConfig);
      expect(mockedFs.readFile).toHaveBeenCalledWith(defaultConfigPath, "utf-8");
    });

    it("設定ファイルが存在しない場合はエラーを投げる", async () => {
      const notFoundError = new Error("ENOENT: no such file or directory");
      (notFoundError as any).code = "ENOENT";
      mockedFs.readFile.mockRejectedValue(notFoundError);

      await expect(configManager.loadConfig()).rejects.toThrow("設定ファイルが見つかりません");
    });

    it("不正なJSONの場合はエラーを投げる", async () => {
      mockedFs.readFile.mockResolvedValue("invalid json");

      await expect(configManager.loadConfig()).rejects.toThrow("設定ファイルのJSON形式が不正です");
    });

    it("必須フィールドが不足している場合はエラーを投げる", async () => {
      const invalidConfig = {
        databases: [
          {
            id: "db-1",
            // name が不足
            description: "テストデータベース1",
            enabled: true,
          },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(configManager.loadConfig()).rejects.toThrow("設定ファイルの形式が不正です");
    });

    it("databases配列が空の場合はエラーを投げる", async () => {
      const emptyConfig = { databases: [] };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(emptyConfig));

      await expect(configManager.loadConfig()).rejects.toThrow("データベース設定が空です");
    });
  });

  describe("getEnabledDatabases", () => {
    beforeEach(() => {
      configManager = new DatabaseConfigManager();
    });

    it("有効化されたデータベースのみを返す", async () => {
      const config = {
        databases: [
          { id: "db-1", name: "DB 1", description: "desc1", enabled: true },
          { id: "db-2", name: "DB 2", description: "desc2", enabled: false },
          { id: "db-3", name: "DB 3", description: "desc3", enabled: true },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await configManager.getEnabledDatabases();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("db-1");
      expect(result[1].id).toBe("db-3");
    });

    it("全てのデータベースが無効化されている場合は空配列を返す", async () => {
      const config = {
        databases: [
          { id: "db-1", name: "DB 1", description: "desc1", enabled: false },
          { id: "db-2", name: "DB 2", description: "desc2", enabled: false },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await configManager.getEnabledDatabases();

      expect(result).toHaveLength(0);
    });
  });

  describe("getDatabaseById", () => {
    beforeEach(() => {
      configManager = new DatabaseConfigManager();
    });

    it("指定されたIDのデータベース設定を返す", async () => {
      const config = {
        databases: [
          { id: "db-1", name: "DB 1", description: "desc1", enabled: true },
          { id: "db-2", name: "DB 2", description: "desc2", enabled: false },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await configManager.getDatabaseById("db-2");

      expect(result).toEqual({ id: "db-2", name: "DB 2", description: "desc2", enabled: false });
    });

    it("存在しないIDの場合はnullを返す", async () => {
      const config = {
        databases: [{ id: "db-1", name: "DB 1", description: "desc1", enabled: true }],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await configManager.getDatabaseById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getAllDatabases", () => {
    beforeEach(() => {
      configManager = new DatabaseConfigManager();
    });

    it("全てのデータベース設定を返す", async () => {
      const config = {
        databases: [
          { id: "db-1", name: "DB 1", description: "desc1", enabled: true },
          { id: "db-2", name: "DB 2", description: "desc2", enabled: false },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await configManager.getAllDatabases();

      expect(result).toEqual(config.databases);
    });
  });
});
