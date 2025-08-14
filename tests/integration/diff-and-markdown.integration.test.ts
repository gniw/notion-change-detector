#!/usr/bin/env tsx

import { config } from "dotenv";
import { MultiDatabaseManager } from "../../src/config/multi-database-manager";
import { MarkdownGenerator } from "../../src/markdown/generator";
import type { DatabaseChanges } from "../../src/notion/differ";
import { NotionDiffer } from "../../src/notion/differ";

config({ path: ".env.local" });

async function testDiffAndMarkdownIntegration() {
  console.log("🚀 差分検出＆Markdown生成 統合テスト");
  console.log("=".repeat(60));

  try {
    const manager = new MultiDatabaseManager();
    const differ = new NotionDiffer();
    const markdownGen = new MarkdownGenerator();

    console.log("📊 データベース情報を取得中...");
    const databaseInfos = await manager.getAllDatabaseInfo();
    console.log(`✅ ${databaseInfos.length} 個のデータベースが見つかりました`);

    const allChanges: DatabaseChanges[] = [];

    for (const dbInfo of databaseInfos) {
      console.log(`\n🔍 ${dbInfo.config.name} (${dbInfo.config.id}) の差分を検出中...`);

      const database = await manager.getDatabaseManager(dbInfo.config.id);
      if (!database) {
        console.log(`  ❌ データベースマネージャーを取得できませんでした`);
        continue;
      }

      const currentPages = await database.getPages();
      console.log(`  📄 現在のページ数: ${currentPages.length}`);

      const stateManager = await manager.getStateManager(dbInfo.config.id);
      if (!stateManager) {
        console.log(`  ❌ ステートマネージャーを取得できませんでした`);
        continue;
      }

      const previousState = await stateManager.loadState();
      console.log(`  📝 前回の状態: ${previousState ? previousState.pages.length : 0} ページ`);

      const previousPages = previousState ? previousState.pages : [];

      const changes = differ.detectPageChanges(
        previousPages,
        currentPages,
        dbInfo.config.id,
        dbInfo.config.name,
      );

      allChanges.push(changes);

      console.log(`  📈 変更検出結果:`);
      console.log(`    - 追加: ${changes.summary.added}件`);
      console.log(`    - 更新: ${changes.summary.updated}件`);
      console.log(`    - 削除: ${changes.summary.deleted}件`);

      if (changes.changes.length > 0) {
        console.log(`  🔸 具体的な変更:`);
        changes.changes.slice(0, 3).forEach((change) => {
          console.log(`    - ${change.changeType}: ${change.title} (${change.id})`);
        });
        if (changes.changes.length > 3) {
          console.log(`    - ... その他 ${changes.changes.length - 3} 件`);
        }
      }
    }

    console.log("\n📝 Markdownレポートを生成中...");

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 全体サマリー:");
    console.log("=".repeat(60));
    const summaryMarkdown = markdownGen.generateSummaryMarkdown(allChanges);
    console.log(summaryMarkdown);

    const changedDatabases = allChanges.filter((db) => db.changes.length > 0);
    if (changedDatabases.length > 0) {
      console.log(`\n${"=".repeat(60)}`);
      console.log("📋 変更があったデータベースの詳細:");
      console.log("=".repeat(60));

      changedDatabases.forEach((db) => {
        const dbMarkdown = markdownGen.generateDatabaseMarkdown(db, { includeTimestamps: true });
        console.log(dbMarkdown);
        console.log(`\n${"-".repeat(40)}`);
      });
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("📄 完全なレポート（実際のPR用フォーマット）:");
    console.log("=".repeat(60));
    const fullMarkdown = markdownGen.generateFullMarkdown(allChanges);
    console.log(fullMarkdown);

    console.log("\n💾 Markdownレポートをファイルに保存中...");

    const reportsDir = "./reports";
    const savedFilePath = await markdownGen.saveReportWithAutoName(allChanges, reportsDir, {
      includeTimestamps: true,
      filePrefix: "notion-changes",
    });

    console.log(`📁 レポートが保存されました: ${savedFilePath}`);

    console.log("\n✅ 差分検出＆Markdown生成 統合テスト完了!");

    const totalChanges = markdownGen.calculateTotalChanges(allChanges);
    console.log(
      `🔢 総変更数: ${totalChanges.total}件 (追加: ${totalChanges.added}, 更新: ${totalChanges.updated}, 削除: ${totalChanges.deleted})`,
    );

    console.log("\n📄 変更があるデータベースの具体例:");
    const hasChanges = allChanges.find((db) => db.changes.length > 0);
    if (hasChanges) {
      console.log(`  📂 ${hasChanges.databaseName}: ${hasChanges.changes.length}件の変更`);
      hasChanges.changes.slice(0, 2).forEach((change) => {
        console.log(`    - ${change.changeType}: ${change.title}`);
        console.log(`      最終編集: ${change.last_edited_time}`);
      });
    } else {
      console.log("  📭 変更があるデータベースはありませんでした");
    }

    console.log(`\n📄 完全なレポートは以下のファイルに保存されています:`);
    console.log(`   ${savedFilePath}`);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDiffAndMarkdownIntegration();
}
