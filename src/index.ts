#!/usr/bin/env node

import { config } from "dotenv";
import { MultiDatabaseManager } from "./config/multi-database-manager";
import { MarkdownGenerator } from "./markdown/generator";
import type { DatabaseChanges } from "./notion/differ";
import { NotionDiffer } from "./notion/differ";

// 環境変数を読み込み
config({ path: ".env.local" });

async function generateNotionChangeReport() {
  console.log("🚀 Notion変更レポート生成を開始します...");
  console.log("=".repeat(60));

  try {
    // 初期化
    const manager = new MultiDatabaseManager();
    const differ = new NotionDiffer();
    const markdownGen = new MarkdownGenerator();

    console.log("📊 データベース情報を取得中...");
    const databaseInfos = await manager.getAllDatabaseInfo();
    console.log(`✅ ${databaseInfos.length}個のデータベースを処理します`);

    const allChanges: DatabaseChanges[] = [];

    // 各データベースの変更を検出
    for (const dbInfo of databaseInfos) {
      console.log(`\n🔍 ${dbInfo.config.name}の変更を検出中...`);

      const database = await manager.getDatabaseManager(dbInfo.config.id);
      if (!database) {
        console.log(`  ⚠️ データベースマネージャーを取得できませんでした`);
        continue;
      }

      const currentPages = await database.getPages();
      console.log(`  📄 現在のページ数: ${currentPages.length}`);

      const stateManager = await manager.getStateManager(dbInfo.config.id);
      if (!stateManager) {
        console.log(`  ⚠️ ステートマネージャーを取得できませんでした`);
        continue;
      }

      const previousState = await stateManager.loadState();
      const previousPages = previousState ? previousState.pages : [];

      const changes = differ.detectPageChanges(
        previousPages,
        currentPages,
        dbInfo.config.id,
        dbInfo.config.name,
      );

      allChanges.push(changes);

      console.log(
        `  📈 変更: +${changes.summary.added} ~${changes.summary.updated} -${changes.summary.deleted}`,
      );

      // 今回の状態を保存
      await stateManager.saveState({
        lastSync: new Date().toISOString(),
        pages: currentPages.map((page) => ({
          id: page.id,
          last_edited_time: page.last_edited_time,
        })),
      });
    }

    // レポート生成と保存
    console.log("\n📝 Markdownレポートを生成・保存中...");

    const totalChanges = markdownGen.calculateTotalChanges(allChanges);
    const reportsDir = "./reports";

    const savedFilePath = await markdownGen.saveReportWithAutoName(allChanges, reportsDir, {
      includeTimestamps: true,
      filePrefix: "notion-changes",
    });

    console.log(`💾 レポートが保存されました: ${savedFilePath}`);

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 実行結果サマリー:");
    console.log("=".repeat(60));
    console.log(`🔢 総変更数: ${totalChanges.total}件`);
    console.log(`   - 追加: ${totalChanges.added}件`);
    console.log(`   - 更新: ${totalChanges.updated}件`);
    console.log(`   - 削除: ${totalChanges.deleted}件`);
    console.log(`📁 レポートファイル: ${savedFilePath}`);

    if (totalChanges.total > 0) {
      console.log("\n📋 変更があったデータベース:");
      allChanges
        .filter((db) => db.changes.length > 0)
        .forEach((db) => {
          console.log(`  - ${db.databaseName}: ${db.changes.length}件`);
        });
    } else {
      console.log("\n✨ 変更はありませんでした");
    }

    console.log("\n✅ Notion変更レポート生成が完了しました！");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  generateNotionChangeReport();
}

export { generateNotionChangeReport };
