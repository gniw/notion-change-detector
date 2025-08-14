import fs from "node:fs/promises";

export interface DatabaseConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface DatabasesConfig {
  databases: DatabaseConfig[];
}

export class DatabaseConfigManager {
  private configPath: string;
  private cachedConfig: DatabasesConfig | null = null;

  constructor(configPath = "./notion-databases.json") {
    this.configPath = configPath;
  }

  async loadConfig(): Promise<DatabasesConfig> {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      const config = JSON.parse(data) as DatabasesConfig;

      // バリデーション
      this.validateConfig(config);

      // キャッシュに保存
      this.cachedConfig = config;

      return config;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error("設定ファイルが見つかりません");
      }

      if (error instanceof SyntaxError) {
        throw new Error("設定ファイルのJSON形式が不正です");
      }

      throw error;
    }
  }

  private validateConfig(config: any): void {
    if (!config || typeof config !== "object") {
      throw new Error("設定ファイルの形式が不正です");
    }

    if (!Array.isArray(config.databases)) {
      throw new Error("設定ファイルの形式が不正です");
    }

    if (config.databases.length === 0) {
      throw new Error("データベース設定が空です");
    }

    for (const db of config.databases) {
      if (!db.id || !db.name || typeof db.enabled !== "boolean") {
        throw new Error("設定ファイルの形式が不正です");
      }
    }
  }

  async getEnabledDatabases(): Promise<DatabaseConfig[]> {
    const config = this.cachedConfig || (await this.loadConfig());
    return config.databases.filter((db) => db.enabled);
  }

  async getDatabaseById(id: string): Promise<DatabaseConfig | null> {
    const config = this.cachedConfig || (await this.loadConfig());
    return config.databases.find((db) => db.id === id) || null;
  }

  async getAllDatabases(): Promise<DatabaseConfig[]> {
    const config = this.cachedConfig || (await this.loadConfig());
    return config.databases;
  }
}
