import type { StateDelta, MultiDatabaseStateDelta } from "./state-comparison";

/**
 * GitHub Actions用の増分レポート生成器
 * 既存PRに追加する差分のみのレポートを生成
 */

export interface IncrementalReportOptions {
  date: string;
  environment: string;
  includeTimestamps: boolean;
  maxChangesPerDatabase: number;
}

export class IncrementalReportGenerator {
  
  /**
   * 複数データベースの差分から増分レポートを生成
   */
  generateIncrementalReport(
    delta: MultiDatabaseStateDelta,
    options: IncrementalReportOptions
  ): string | null {
    if (!delta.hasChanges) {
      return null;
    }

    const lines = [
      `# 📊 Incremental Changes - ${options.date}`,
      "",
      `> **Environment**: ${options.environment}`,
      `> **Generated**: ${new Date().toISOString()}`,
      "",
      this.generateSummarySection(delta),
      ""
    ];

    // データベース別の詳細変更
    for (const dbDelta of delta.deltas) {
      lines.push(...this.generateDatabaseSection(dbDelta, options));
      lines.push("");
    }

    // フッター
    lines.push("---");
    lines.push("*This is an incremental update to avoid duplicate content.*");

    return lines.join("\n");
  }

  /**
   * サマリーセクションの生成
   */
  private generateSummarySection(delta: MultiDatabaseStateDelta): string {
    const { added, updated, deleted } = delta.totalChanges;
    const total = added + updated + deleted;

    const lines = [
      `## 📋 Summary`,
      "",
      `**Total Changes**: ${total}`,
      `- ➕ Added: ${added}`,
      `- 📝 Updated: ${updated}`,
      `- ❌ Deleted: ${deleted}`,
      "",
      `**Databases Affected**: ${delta.deltas.length}`
    ];

    return lines.join("\n");
  }

  /**
   * データベースセクションの生成
   */
  private generateDatabaseSection(
    dbDelta: StateDelta,
    options: IncrementalReportOptions
  ): string[] {
    const lines = [
      `## 🗂️ ${dbDelta.databaseName}`,
      "",
      `**Database Changes**: ${dbDelta.summary.added + dbDelta.summary.updated + dbDelta.summary.deleted}`,
      `- ➕ Added: ${dbDelta.summary.added}`,
      `- 📝 Updated: ${dbDelta.summary.updated}`,
      `- ❌ Deleted: ${dbDelta.summary.deleted}`,
      ""
    ];

    // 変更の詳細（制限数まで）
    const changesToShow = dbDelta.changedPages.slice(0, options.maxChangesPerDatabase);
    const remainingChanges = dbDelta.changedPages.length - changesToShow.length;

    for (const change of changesToShow) {
      lines.push(...this.generateChangeDetail(change, options.includeTimestamps));
    }

    if (remainingChanges > 0) {
      lines.push(`*... and ${remainingChanges} more changes*`);
      lines.push("");
    }

    return lines;
  }

  /**
   * 個別変更の詳細生成
   */
  private generateChangeDetail(
    change: StateDelta["changedPages"][0],
    includeTimestamps: boolean
  ): string[] {
    const lines = [];

    // 変更タイプに応じたアイコンとタイトル
    const typeIcon = {
      added: "➕",
      updated: "📝", 
      deleted: "❌"
    }[change.changeType];

    let titleLine = `### ${typeIcon} ${change.changeType.toUpperCase()}: ${change.title}`;
    
    if (includeTimestamps) {
      titleLine += ` *(${change.last_edited_time})*`;
    }

    lines.push(titleLine);
    lines.push("");

    // 追加の場合：初期プロパティを表示
    if (change.changeType === "added" && change.initialProperties) {
      lines.push("**Initial Properties:**");
      for (const [key, value] of Object.entries(change.initialProperties)) {
        if (value !== null && value !== undefined && value !== "") {
          lines.push(`- **${key}**: ${this.formatPropertyValue(value)}`);
        }
      }
      lines.push("");
    }

    // 更新の場合：プロパティ変更を表示
    if (change.changeType === "updated" && change.propertyChanges?.length) {
      lines.push("**Property Changes:**");
      for (const propChange of change.propertyChanges) {
        const prev = this.formatPropertyValue(propChange.previousValue);
        const curr = this.formatPropertyValue(propChange.currentValue);
        lines.push(`- **${propChange.propertyName}**: ${prev} → ${curr}`);
      }
      lines.push("");
    }

    return lines;
  }

  /**
   * プロパティ値のフォーマット
   */
  private formatPropertyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "*empty*";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return "*empty array*";
      return `[${value.join(", ")}]`;
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    const strValue = String(value);
    return strValue.length > 50 ? `${strValue.substring(0, 50)}...` : strValue;
  }

  /**
   * レポートファイル名の生成
   */
  generateIncrementalReportFileName(environment: string, date: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `incremental-${environment}-${date}-${timestamp}.md`;
  }

  /**
   * 簡易レポート（PR本文用）の生成
   */
  generateBriefSummary(delta: MultiDatabaseStateDelta): string {
    if (!delta.hasChanges) {
      return "No new changes detected.";
    }

    const { added, updated, deleted } = delta.totalChanges;
    const total = added + updated + deleted;

    const lines = [
      `**${total} new changes detected**`,
      `- ➕ ${added} added, 📝 ${updated} updated, ❌ ${deleted} deleted`,
      `- Across ${delta.deltas.length} database(s)`
    ];

    return lines.join("\n");
  }
}