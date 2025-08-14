import fs from "node:fs/promises";
import path from "node:path";
import type { DatabaseChanges, PageChange } from "../notion/differ";

export interface GenerationOptions {
  includeTimestamps?: boolean;
  reportDate?: Date;
}

export interface SaveOptions extends GenerationOptions {
  filePrefix?: string;
}

export interface TotalChanges {
  added: number;
  updated: number;
  deleted: number;
  total: number;
}

export class MarkdownGenerator {
  generateDatabaseMarkdown(changes: DatabaseChanges, options: GenerationOptions = {}): string {
    const sections: string[] = [];

    sections.push(`## ${changes.databaseName}`);

    if (changes.changes.length === 0) {
      sections.push("**変更なし**");
      return sections.join("\n\n");
    }

    const { added, updated, deleted } = changes.summary;
    sections.push(`**追加: ${added}件, 更新: ${updated}件, 削除: ${deleted}件**`);

    const addedPages = changes.changes.filter((c) => c.changeType === "added");
    if (addedPages.length > 0) {
      sections.push(`### 📝 追加されたページ (${addedPages.length}件)`);
      sections.push(addedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
    }

    const updatedPages = changes.changes.filter((c) => c.changeType === "updated");
    if (updatedPages.length > 0) {
      sections.push(`### 🔄 更新されたページ (${updatedPages.length}件)`);
      sections.push(updatedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
    }

    const deletedPages = changes.changes.filter((c) => c.changeType === "deleted");
    if (deletedPages.length > 0) {
      sections.push(`### 🗑️ 削除されたページ (${deletedPages.length}件)`);
      sections.push(deletedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
    }

    return sections.join("\n\n");
  }

  generateSummaryMarkdown(allChanges: DatabaseChanges[], options: GenerationOptions = {}): string {
    const sections: string[] = [];

    sections.push("# Notion データベース変更レポート");

    const reportDate = options.reportDate || new Date();
    sections.push(`**レポート生成日時**: ${reportDate.toISOString()}`);

    const totalChanges = this.calculateTotalChanges(allChanges);

    sections.push("## 📊 全体サマリー");

    if (totalChanges.total === 0) {
      sections.push("変更がありませんでした。");
    } else {
      sections.push(`- **追加**: ${totalChanges.added}件`);
      sections.push(`- **更新**: ${totalChanges.updated}件`);
      sections.push(`- **削除**: ${totalChanges.deleted}件`);
      sections.push(`- **合計変更数**: ${totalChanges.total}件`);
    }

    if (allChanges.length > 0) {
      sections.push("### データベース別サマリー");
      sections.push("| データベース名 | 追加 | 更新 | 削除 | 合計 |");
      sections.push("|---|---|---|---|---|");

      allChanges.forEach((db) => {
        const total = db.summary.added + db.summary.updated + db.summary.deleted;
        sections.push(
          `| ${db.databaseName} | ${db.summary.added} | ${db.summary.updated} | ${db.summary.deleted} | ${total} |`,
        );
      });
    }

    return sections.join("\n");
  }

  generateFullMarkdown(allChanges: DatabaseChanges[], options: GenerationOptions = {}): string {
    const sections: string[] = [];

    sections.push(this.generateSummaryMarkdown(allChanges, options));

    const changedDatabases = allChanges.filter((db) => db.changes.length > 0);

    if (changedDatabases.length > 0) {
      sections.push("## 📋 データベース詳細");

      changedDatabases.forEach((db) => {
        sections.push(`### ${db.databaseName}`);

        const addedPages = db.changes.filter((c) => c.changeType === "added");
        if (addedPages.length > 0) {
          sections.push(`#### 📝 追加されたページ (${addedPages.length}件)`);
          sections.push(addedPages.map((page) => `- ${this.formatPageLink(page)}`).join("\n"));
        }

        const updatedPages = db.changes.filter((c) => c.changeType === "updated");
        if (updatedPages.length > 0) {
          sections.push(`#### 🔄 更新されたページ (${updatedPages.length}件)`);
          sections.push(updatedPages.map((page) => `- ${this.formatPageLink(page)}`).join("\n"));
        }

        const deletedPages = db.changes.filter((c) => c.changeType === "deleted");
        if (deletedPages.length > 0) {
          sections.push(`#### 🗑️ 削除されたページ (${deletedPages.length}件)`);
          sections.push(deletedPages.map((page) => `- ${this.formatPageLink(page)}`).join("\n"));
        }
      });
    }

    return sections.join("\n\n");
  }

  formatPageLink(pageChange: PageChange): string {
    const escapedTitle = this.escapeMarkdown(pageChange.title);
    return `[${escapedTitle}](https://notion.so/${pageChange.id})`;
  }

  calculateTotalChanges(allChanges: DatabaseChanges[]): TotalChanges {
    if (allChanges.length === 0) {
      return { added: 0, updated: 0, deleted: 0, total: 0 };
    }

    const totals = allChanges.reduce(
      (acc, db) => ({
        added: acc.added + db.summary.added,
        updated: acc.updated + db.summary.updated,
        deleted: acc.deleted + db.summary.deleted,
      }),
      { added: 0, updated: 0, deleted: 0 },
    );

    return {
      ...totals,
      total: totals.added + totals.updated + totals.deleted,
    };
  }

  private formatPageItem(page: PageChange, options: GenerationOptions): string {
    let item = `- ${this.formatPageLink(page)}`;

    if (options.includeTimestamps) {
      item += ` (最終編集: ${page.last_edited_time}`;
      if (page.previous_time) {
        item += `, 前回: ${page.previous_time}`;
      }
      item += ")";
    }

    return item;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[[\]*_`~]/g, "\\$&");
  }

  async saveReportToFile(
    allChanges: DatabaseChanges[],
    filePath: string,
    options: GenerationOptions = {},
  ): Promise<void> {
    const reportContent = this.generateFullMarkdown(allChanges, options);

    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, reportContent, "utf-8");
  }

  generateFileName(prefix = "notion-changes", date?: Date, includeTime = true): string {
    const now = date || new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    let datePart = `${year}-${month}-${day}`;

    if (includeTime) {
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      datePart += `-${hours}${minutes}${seconds}`;
    }

    return `${prefix}-${datePart}.md`;
  }

  async saveReportWithAutoName(
    allChanges: DatabaseChanges[],
    reportsDir: string,
    options: SaveOptions = {},
  ): Promise<string> {
    const { filePrefix, ...generationOptions } = options;
    const fileName = this.generateFileName(filePrefix, generationOptions.reportDate);
    const filePath = path.join(reportsDir, fileName);

    await this.saveReportToFile(allChanges, filePath, generationOptions);

    return filePath;
  }
}
