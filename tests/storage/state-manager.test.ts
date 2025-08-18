import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StateManager } from "../../scripts/notion/storage/state-manager";

// ファイルシステムをモック
vi.mock("fs/promises");
const mockedFs = vi.mocked(fs);

describe("StateManager", () => {
  let stateManager: StateManager;
  const mockStateDir = "./test-state";
  const mockDatabaseId = "test-database-123";

  beforeEach(() => {
    vi.clearAllMocks();
    stateManager = new StateManager(mockStateDir, mockDatabaseId);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("指定されたディレクトリとデータベースIDで初期化できる", () => {
      expect(stateManager).toBeDefined();
    });

    it("デフォルト値でインスタンスを作成できる", () => {
      process.env.NOTION_DATABASE_ID = mockDatabaseId;
      const defaultManager = new StateManager();

      expect(defaultManager).toBeDefined();
    });
  });

  describe("saveState", () => {
    const mockState = {
      lastSync: "2023-12-01T00:00:00.000Z",
      pages: [
        { id: "page-1", last_edited_time: "2023-12-01T00:00:00.000Z" },
        { id: "page-2", last_edited_time: "2023-12-01T01:00:00.000Z" },
      ],
    };

    it("状態をJSONファイルに保存できる", async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      await stateManager.saveState(mockState);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(mockStateDir, { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(mockStateDir, `${mockDatabaseId}.json`),
        JSON.stringify(mockState, null, 2),
        "utf-8",
      );
    });

    it("ディレクトリ作成エラーを適切に処理する", async () => {
      mockedFs.mkdir.mockRejectedValue(new Error("Permission denied"));

      await expect(stateManager.saveState(mockState)).rejects.toThrow("Permission denied");
    });

    it("ファイル書き込みエラーを適切に処理する", async () => {
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockRejectedValue(new Error("Disk full"));

      await expect(stateManager.saveState(mockState)).rejects.toThrow("Disk full");
    });
  });

  describe("loadState", () => {
    const mockState = {
      lastSync: "2023-12-01T00:00:00.000Z",
      pages: [{ id: "page-1", last_edited_time: "2023-12-01T00:00:00.000Z" }],
    };

    it("保存された状態を読み込める", async () => {
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockState));

      const result = await stateManager.loadState();

      expect(result).toEqual(mockState);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(mockStateDir, `${mockDatabaseId}.json`),
        "utf-8",
      );
    });

    it("ファイルが存在しない場合はnullを返す", async () => {
      const notFoundError = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
      notFoundError.code = "ENOENT";
      mockedFs.readFile.mockRejectedValue(notFoundError);

      const result = await stateManager.loadState();

      expect(result).toBeNull();
    });

    it("JSONパースエラーの場合はnullを返す", async () => {
      mockedFs.readFile.mockResolvedValue("invalid json");

      const result = await stateManager.loadState();

      expect(result).toBeNull();
    });

    it("その他のエラーの場合は再スローする", async () => {
      mockedFs.readFile.mockRejectedValue(new Error("Permission denied"));

      await expect(stateManager.loadState()).rejects.toThrow("Permission denied");
    });
  });

  describe("hasState", () => {
    it("状態ファイルが存在する場合はtrueを返す", async () => {
      mockedFs.access.mockResolvedValue(undefined);

      const result = await stateManager.hasState();

      expect(result).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(
        path.join(mockStateDir, `${mockDatabaseId}.json`),
      );
    });

    it("状態ファイルが存在しない場合はfalseを返す", async () => {
      const notFoundError = new Error("ENOENT") as NodeJS.ErrnoException;
      notFoundError.code = "ENOENT";
      mockedFs.access.mockRejectedValue(notFoundError);

      const result = await stateManager.hasState();

      expect(result).toBe(false);
    });

    it("アクセスエラーの場合はfalseを返す", async () => {
      mockedFs.access.mockRejectedValue(new Error("Permission denied"));

      const result = await stateManager.hasState();

      expect(result).toBe(false);
    });
  });

  describe("deleteState", () => {
    it("状態ファイルを削除できる", async () => {
      mockedFs.unlink.mockResolvedValue(undefined);

      await stateManager.deleteState();

      expect(mockedFs.unlink).toHaveBeenCalledWith(
        path.join(mockStateDir, `${mockDatabaseId}.json`),
      );
    });

    it("ファイルが存在しない場合でもエラーにならない", async () => {
      const notFoundError = new Error("ENOENT") as NodeJS.ErrnoException;
      notFoundError.code = "ENOENT";
      mockedFs.unlink.mockRejectedValue(notFoundError);

      await expect(stateManager.deleteState()).resolves.not.toThrow();
    });

    it("その他のエラーの場合は再スローする", async () => {
      mockedFs.unlink.mockRejectedValue(new Error("Permission denied"));

      await expect(stateManager.deleteState()).rejects.toThrow("Permission denied");
    });
  });

  describe("getStateFilePath", () => {
    it("状態ファイルのパスを返す", () => {
      const expectedPath = path.join(mockStateDir, `${mockDatabaseId}.json`);

      expect(stateManager.getStateFilePath()).toBe(expectedPath);
    });
  });
});
