import type { NotionClient } from "./client";

export class NotionDatabase {
  private client: NotionClient;
  private databaseId: string;

  constructor(client: NotionClient, databaseId?: string) {
    this.client = client;

    const id = databaseId || process.env.NOTION_DATABASE_ID;
    if (!id) {
      throw new Error("Database ID is required");
    }

    this.databaseId = id;
  }

  async getDatabaseInfo() {
    try {
      const database = await this.client.getClient().databases.retrieve({
        database_id: this.databaseId,
      });
      return database;
    } catch (_error) {
      return null;
    }
  }

  async getPages(options?: { filter?: any }) {
    try {
      const allPages: any[] = [];
      let cursor: string | undefined;

      do {
        const queryParams: any = {
          database_id: this.databaseId,
        };

        if (cursor) {
          queryParams.start_cursor = cursor;
        }

        if (options?.filter) {
          queryParams.filter = options.filter;
        }

        const response = await this.client.getClient().databases.query(queryParams);

        allPages.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
      } while (cursor);

      return allPages;
    } catch (_error) {
      return [];
    }
  }

  getDatabaseId(): string {
    return this.databaseId;
  }
}
