import { Client } from "@notionhq/client";

export class NotionClient {
  private client: Client;
  private connected = false;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.NOTION_API_KEY;

    if (!key) {
      throw new Error("NOTION_API_KEY environment variable is required");
    }

    this.client = new Client({ auth: key });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.users.me();
      this.connected = true;
      return true;
    } catch (_error) {
      this.connected = false;
      return false;
    }
  }

  getClient(): Client {
    return this.client;
  }
}
