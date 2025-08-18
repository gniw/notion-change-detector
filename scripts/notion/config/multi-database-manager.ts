import type { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionClient } from "../notion/client";
import { NotionDatabase } from "../notion/database";
import { StateManager } from "../storage/state-manager";
import { type DatabaseConfig, DatabaseConfigManager } from "./database-config-manager";

export interface DatabaseInfo {
  config: DatabaseConfig;
  info: DatabaseObjectResponse | null;
}

export class MultiDatabaseManager {
  private configManager: DatabaseConfigManager;
  private notionClient: NotionClient;
  private initialized = false;

  constructor(configPath?: string, _stateDir = "./state") {
    this.configManager = new DatabaseConfigManager(configPath);
    this.notionClient = new NotionClient();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.configManager.loadConfig();
    this.initialized = true;
  }

  async getEnabledDatabases(): Promise<DatabaseConfig[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.configManager.getEnabledDatabases();
  }

  async getDatabaseManager(databaseId: string): Promise<NotionDatabase | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config = await this.configManager.getDatabaseById(databaseId);

    if (!config || !config.enabled) {
      return null;
    }

    return new NotionDatabase(this.notionClient, databaseId);
  }

  async getStateManager(databaseId: string): Promise<StateManager | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config = await this.configManager.getDatabaseById(databaseId);

    if (!config) {
      return null;
    }

    return new StateManager("./state", databaseId);
  }

  async getAllDatabaseInfo(): Promise<DatabaseInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const enabledDatabases = await this.configManager.getEnabledDatabases();
    const results: DatabaseInfo[] = [];

    for (const config of enabledDatabases) {
      try {
        const database = new NotionDatabase(this.notionClient, config.id);
        const info = await database.getDatabaseInfo();

        if (info) {
          results.push({ config, info });
        }
      } catch (error) {
        // エラーが発生したデータベースはスキップ
        console.warn(`Failed to get info for database ${config.name} (${config.id}):`, error);
      }
    }

    return results;
  }

  async testConnection(): Promise<boolean> {
    return await this.notionClient.testConnection();
  }

  getNotionClient(): NotionClient {
    return this.notionClient;
  }

  async getAllDatabases(): Promise<DatabaseConfig[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.configManager.getAllDatabases();
  }
}
