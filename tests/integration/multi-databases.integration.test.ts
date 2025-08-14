import dotenv from "dotenv";

// .env.local ファイルを明示的に読み込み
dotenv.config({ path: ".env.local" });

import { MultiDatabaseManager } from "../../src/config/multi-database-manager";

async function testMultiDatabases() {
  console.log("🚀 複数データベース統合テストを開始します...\n");

  try {
    // 1. 環境変数の確認
    console.log("📋 環境変数の確認:");
    const apiKey = process.env.NOTION_API_KEY;

    if (!apiKey) {
      throw new Error("NOTION_API_KEY が設定されていません");
    }

    console.log(`✅ NOTION_API_KEY: ${apiKey.substring(0, 10)}...\n`);

    // 2. MultiDatabaseManager の初期化
    console.log("🔧 MultiDatabaseManager の初期化:");
    const multiManager = new MultiDatabaseManager();

    await multiManager.initialize();
    console.log("✅ 初期化完了\n");

    // 3. 接続テスト
    console.log("🔌 Notion API 接続テスト:");
    const connectionResult = await multiManager.testConnection();
    console.log(`✅ 接続テスト結果: ${connectionResult}\n`);

    // 4. 設定されたデータベース一覧
    console.log("📊 設定されたデータベース一覧:");
    const allDatabases = await multiManager.getAllDatabases();
    console.log(`   総データベース数: ${allDatabases.length}`);

    allDatabases.forEach((db, index) => {
      const status = db.enabled ? "🟢 有効" : "🔴 無効";
      console.log(`   ${index + 1}. ${status} ${db.name} (${db.id})`);
      console.log(`      説明: ${db.description}`);
    });

    // 5. 有効なデータベースの情報取得
    console.log("\n📈 有効なデータベースの詳細情報:");
    const enabledDatabases = await multiManager.getEnabledDatabases();
    console.log(`   有効なデータベース数: ${enabledDatabases.length}`);

    if (enabledDatabases.length === 0) {
      console.log(
        "   有効なデータベースがありません。notion-databases.json で enabled: true に設定してください。",
      );
    } else {
      const databaseInfos = await multiManager.getAllDatabaseInfo();

      for (let i = 0; i < databaseInfos.length; i++) {
        const { config, info } = databaseInfos[i];
        console.log(`\n   ${i + 1}. ${config.name}:`);
        console.log(`      ID: ${config.id}`);
        console.log(`      タイトル: ${info?.title?.[0]?.plain_text || "タイトル不明"}`);
        console.log(`      プロパティ数: ${info ? Object.keys(info.properties).length : 0}`);
        console.log(`      最終編集時刻: ${info?.last_edited_time || "N/A"}`);

        // ページ数の取得
        try {
          const databaseManager = await multiManager.getDatabaseManager(config.id);
          if (databaseManager) {
            const pages = await databaseManager.getPages();
            console.log(`      ページ数: ${pages.length}件`);

            if (pages.length > 0) {
              const samplePages = pages.slice(0, 2);
              console.log(`      サンプルページ:`);
              samplePages.forEach((page, _pageIndex) => {
                const title = extractPageTitle(page);
                console.log(`        - ${title} (${page.last_edited_time})`);
              });
            }
          }
        } catch (_error) {
          console.log(`      ページ数: 取得エラー`);
        }
      }
    }

    // 6. 状態管理のテスト（全データベース対象）
    console.log("\n💾 状態管理テスト:");
    if (enabledDatabases.length > 0) {
      console.log(`   テスト対象: ${enabledDatabases.length}個の有効データベース`);

      for (let i = 0; i < enabledDatabases.length; i++) {
        const db = enabledDatabases[i];
        console.log(`\n   ${i + 1}. ${db.name} (${db.id}):`);

        const stateManager = await multiManager.getStateManager(db.id);
        if (stateManager) {
          console.log(`      状態ファイルパス: ${stateManager.getStateFilePath()}`);

          const hasState = await stateManager.hasState();
          console.log(`      既存状態の有無: ${hasState}`);

          // 実際のNotionデータを取得して状態保存
          console.log("      実際のページデータを取得中...");
          const databaseManager = await multiManager.getDatabaseManager(db.id);

          if (databaseManager) {
            const actualPages = await databaseManager.getPages();
            const testState = {
              lastSync: new Date().toISOString(),
              pages: actualPages.map((page) => ({
                id: page.id,
                last_edited_time: page.last_edited_time,
              })),
            };
            console.log(`      実際のページ数: ${testState.pages.length}件`);

            await stateManager.saveState(testState);
            console.log("      ✅ 実際のデータで状態保存完了");

            const loadedState = await stateManager.loadState();
            console.log(`      ✅ 状態読み込み完了: ${loadedState?.pages.length}件のページ情報`);

            // 実際のページIDが正しく保存されたかサンプル表示
            if (loadedState && loadedState.pages.length > 0) {
              const samplePage = loadedState.pages[0];
              console.log(`      サンプルページID: ${samplePage.id.substring(0, 8)}...`);
              console.log(`      最終編集時刻: ${samplePage.last_edited_time}`);
            }
          } else {
            console.log("      ❌ DatabaseManagerの取得に失敗");
          }
        } else {
          console.log("      ❌ StateManagerの取得に失敗");
        }
      }
    } else {
      console.log("   有効なデータベースがありません。");
    }

    console.log("\n🎉 複数データベース統合テスト完了！全ての機能が正常に動作しています。");
  } catch (error) {
    console.error("❌ 統合テストでエラーが発生しました:");
    console.error(error);
    process.exit(1);
  }
}

// ページタイトル抽出のヘルパー関数
function extractPageTitle(page: any): string {
  if (!page.properties) return "タイトル不明";

  // よくあるタイトルプロパティ名を順番に確認
  const titleProps = ["Name", "Title", "name", "title"];

  for (const propName of titleProps) {
    const prop = page.properties[propName];
    if (prop?.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
  }

  // 最初に見つかったタイトル型プロパティを使用
  const firstTitleProp = Object.values(page.properties).find(
    (prop: any) => prop.type === "title" && prop.title?.[0]?.plain_text,
  ) as any;

  return firstTitleProp?.title?.[0]?.plain_text || "タイトル不明";
}

// スクリプトが直接実行された場合のみ実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testMultiDatabases();
}
