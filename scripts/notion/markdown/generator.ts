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
          sections.push(addedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
        }

        const updatedPages = db.changes.filter((c) => c.changeType === "updated");
        if (updatedPages.length > 0) {
          sections.push(`#### 🔄 更新されたページ (${updatedPages.length}件)`);
          sections.push(updatedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
        }

        const deletedPages = db.changes.filter((c) => c.changeType === "deleted");
        if (deletedPages.length > 0) {
          sections.push(`#### 🗑️ 削除されたページ (${deletedPages.length}件)`);
          sections.push(deletedPages.map((page) => this.formatPageItem(page, options)).join("\n"));
        }
      });
    }

    return sections.join("\n\n");
  }

  formatPageLink(pageChange: PageChange): string {
    const escapedTitle = this.escapeMarkdown(pageChange.title);
    return escapedTitle;
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
      item += ` (${this.formatTimestamp(page.last_edited_time)}`;
      if (page.previous_time) {
        item += `, 前回: ${this.formatTimestamp(page.previous_time)}`;
      }
      item += ")";
    }

    // 追加されたページの初期プロパティを表示
    if (page.changeType === "added" && page.initialProperties && Object.keys(page.initialProperties).length > 0) {
      item += "\n\n  **初期プロパティ:**\n";
      item += "  | プロパティ名 | 設定値 |\n";
      item += "  |---|---|\n";
      Object.entries(page.initialProperties).forEach(([propertyName, value]) => {
        const formattedValue = this.formatPropertyValueForTable(value);
        item += `  | **${propertyName}** | ${formattedValue} |\n`;
      });
      item = item.trimEnd(); // 末尾の改行を削除
    }

    // プロパティ変更がある場合は詳細を表示
    if (page.propertyChanges && page.propertyChanges.length > 0) {
      item += "\n\n  **変更されたプロパティ:**\n";
      item += "  | プロパティ名 | 変更前 | 変更後 |\n";
      item += "  |---|---|---|\n";
      page.propertyChanges.forEach(change => {
        const previousText = this.formatPropertyValueForTable(change.previousValue);
        const currentText = this.formatPropertyValueForTable(change.currentValue);
        
        // リレーションプロパティの場合は詳細な変更情報を追加
        if (Array.isArray(change.previousValue) && Array.isArray(change.currentValue) &&
            (this.isRelationArray(change.previousValue) || this.isRelationArray(change.currentValue))) {
          const relationDiff = this.getRelationDiff(change.previousValue, change.currentValue);
          const diffText = relationDiff ? ` (${relationDiff})` : '';
          item += `  | **${change.propertyName}** | ${previousText} | ${currentText}${diffText} |\n`;
        } else {
          item += `  | **${change.propertyName}** | ${previousText} | ${currentText} |\n`;
        }
      });
      item = item.trimEnd(); // 末尾の改行を削除
    }

    return item;
  }

  private formatPropertyValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "(未設定)";
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }
      return `[${value.map(v => String(v)).join(", ")}]`;
    }
    
    if (typeof value === "string") {
      return value === "" ? "(空文字)" : `"${value}"`;
    }
    
    return String(value);
  }

  private formatPropertyValueForTable(value: unknown): string {
    if (value === undefined || value === null) {
      return "*(未設定)*";
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "*[]* (空配列)";
      }
      
      // リレーションプロパティ（ページIDの配列）かどうかを判定
      if (this.isRelationArray(value)) {
        return `リレーション ${value.length}件`;
      }
      
      // 通常の配列処理
      const items = value.map(v => String(v));
      const joinedItems = items.join(", ");
      if (joinedItems.length > 50) {
        return `[${items.slice(0, 3).join(", ")}...] (${items.length}項目)`;
      }
      return `[${joinedItems}]`;
    }
    
    if (typeof value === "string") {
      if (value === "") {
        return "*(空文字)*";
      }
      // 長い文字列は省略表示
      const escapedValue = this.escapeMarkdown(value);
      if (escapedValue.length > 100) {
        return `"${escapedValue.substring(0, 97)}..."`;
      }
      return `"${escapedValue}"`;
    }
    
    if (typeof value === "number" || typeof value === "boolean") {
      return `\`${value}\``;
    }
    
    // その他の型（オブジェクトなど）
    const stringValue = String(value);
    if (stringValue.length > 50) {
      return `${stringValue.substring(0, 47)}...`;
    }
    return stringValue;
  }

  private isRelationArray(array: unknown[]): boolean {
    // すべての要素がページID形式（UUID形式の文字列）かどうかをチェック
    return array.length > 0 && array.every(item => 
      typeof item === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item)
    );
  }

  private getRelationDiff(previousValue: unknown[], currentValue: unknown[]): string {
    const prevSet = new Set(previousValue.map(v => String(v)));
    const currSet = new Set(currentValue.map(v => String(v)));
    
    const added = [...currSet].filter(id => !prevSet.has(id));
    const removed = [...prevSet].filter(id => !currSet.has(id));
    
    const changes: string[] = [];
    if (added.length > 0) {
      changes.push(`${added.length}件追加`);
    }
    if (removed.length > 0) {
      changes.push(`${removed.length}件削除`);
    }
    
    return changes.join(", ");
  }

  formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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
