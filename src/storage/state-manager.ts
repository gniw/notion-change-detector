import fs from "node:fs/promises";
import path from "node:path";

export interface DatabaseState {
  lastSync: string;
  pages: Array<{
    id: string;
    last_edited_time: string;
    [key: string]: any;
  }>;
}

export class StateManager {
  private stateDir: string;
  private databaseId: string;
  private stateFilePath: string;

  constructor(stateDir = "./state", databaseId?: string) {
    this.stateDir = stateDir;

    const id = databaseId || process.env.NOTION_DATABASE_ID;
    if (!id) {
      throw new Error("Database ID is required");
    }

    this.databaseId = id;
    this.stateFilePath = path.join(this.stateDir, `${this.databaseId}.json`);
  }

  async saveState(state: DatabaseState): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });

    const stateData = JSON.stringify(state, null, 2);
    await fs.writeFile(this.stateFilePath, stateData, "utf-8");
  }

  async loadState(): Promise<DatabaseState | null> {
    try {
      const data = await fs.readFile(this.stateFilePath, "utf-8");
      return JSON.parse(data) as DatabaseState;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }

      // JSONパースエラーの場合もnullを返す
      if (error instanceof SyntaxError) {
        return null;
      }

      throw error;
    }
  }

  async hasState(): Promise<boolean> {
    try {
      await fs.access(this.stateFilePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteState(): Promise<void> {
    try {
      await fs.unlink(this.stateFilePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  getStateFilePath(): string {
    return this.stateFilePath;
  }
}
