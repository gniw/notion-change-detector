#!/bin/bash

# GitHub Actions用の増分レポート生成スクリプト
# Usage: ./generate-incremental-report.sh <environment> [pr-branch]
# Environment: NOTION_API_KEY が必要

set -euo pipefail

ENVIRONMENT="${1:-}"
PR_BRANCH="${2:-}"

if [ -z "$ENVIRONMENT" ]; then
    echo "Error: Environment parameter is required"
    echo "Usage: $0 <test|production> [pr-branch]"
    exit 1
fi

echo "🔄 Generating incremental report for $ENVIRONMENT environment..."

# TypeScriptスクリプトを現在のディレクトリに作成
cat > ./temp-incremental-report-generator.ts <<'EOF'
import { DatabaseConfigManager } from './scripts/notion/config/database-config-manager';
import { NotionClient } from './scripts/notion/notion/client';
import { PropertyExtractor } from './scripts/notion/notion/property-extractor';
import { StateManager } from './scripts/notion/storage/state-manager';
import { StateComparison } from './scripts/notion/github-actions/state-comparison';
import { IncrementalReportGenerator } from './scripts/notion/github-actions/incremental-report-generator';
import { GitOperations } from './scripts/notion/github-actions/git-operations';
import fs from 'node:fs/promises';
import path from 'path';

interface ScriptOptions {
  environment: string;
  prBranch?: string;
  outputDir: string;
}

async function generateIncrementalReport(options: ScriptOptions) {
  console.log(`🚀 Starting incremental report generation for ${options.environment} environment...`);

  try {
    // 1. データベース設定の読み込み
    console.log("📊 Loading database configuration...");
    const configManager = new DatabaseConfigManager();
    const config = await configManager.loadConfig();
    const enabledDbs = await configManager.getEnabledDatabases();
    console.log(`✅ Found ${enabledDbs.length} enabled databases`);

    // 2. Notion APIクライアントの初期化
    const notionClient = new NotionClient();
    const propertyExtractor = new PropertyExtractor();
    const stateComparison = new StateComparison();
    const reportGenerator = new IncrementalReportGenerator();

    // 3. 前回のstate読み込み（PRブランチが指定されている場合）
    let previousStates: Record<string, any> = {};
    if (options.prBranch) {
      console.log(`📂 Loading previous state from PR branch: ${options.prBranch}`);
      const gitOps = new GitOperations({ verbose: true });
      const loadedStates = await gitOps.loadStateFromBranch(options.prBranch);
      previousStates = loadedStates || {};
      console.log(`📋 Loaded ${Object.keys(previousStates).length} previous states`);
    }

    // 4. 現在のNotionデータを取得
    console.log("🔍 Fetching current Notion data...");
    const currentStates: Record<string, any> = {};
    const databaseNames: Record<string, string> = {};

    for (const db of enabledDbs) {
      console.log(`  📄 Processing database: ${db.name}`);
      
      try {
        const pages = await notionClient.queryDatabase(db.id);
        const extractedPages = pages.map(page => propertyExtractor.extractProperties(page));
        
        currentStates[db.id] = {
          lastSync: new Date().toISOString(),
          pages: extractedPages.map(page => ({
            id: page.id,
            last_edited_time: page.last_edited_time,
            properties: page.properties
          }))
        };
        databaseNames[db.id] = db.name;
        
        console.log(`    ✅ ${extractedPages.length} pages processed`);
      } catch (error: any) {
        console.error(`    ❌ Failed to process ${db.name}: ${error.message}`);
        throw error;
      }
    }

    // 5. 差分計算
    console.log("🔄 Calculating differences...");
    const delta = stateComparison.calculateMultiDatabaseDelta(
      previousStates,
      currentStates,
      databaseNames
    );

    console.log("📊 Difference calculation results:");
    console.log(stateComparison.getDeltaSummary(delta));

    // 6. 増分レポート生成
    if (delta.hasChanges) {
      console.log("📝 Generating incremental report...");
      
      const reportOptions = {
        date: new Date().toISOString().split('T')[0],
        environment: options.environment,
        includeTimestamps: true,
        maxChangesPerDatabase: 20
      };

      const report = reportGenerator.generateIncrementalReport(delta, reportOptions);
      
      if (report) {
        // レポートファイルの保存
        await fs.mkdir(options.outputDir, { recursive: true });
        const fileName = reportGenerator.generateIncrementalReportFileName(
          options.environment,
          reportOptions.date
        );
        const filePath = path.join(options.outputDir, fileName);
        
        await fs.writeFile(filePath, report, 'utf-8');
        console.log(`💾 Incremental report saved: ${filePath}`);

        // GitHub Actions用の出力変数設定
        console.log(`has-incremental-changes=true`);
        console.log(`incremental-report-file=${filePath}`);
        console.log(`changes-summary=${reportGenerator.generateBriefSummary(delta)}`);
        
        // 現在のstateを保存（次回の比較用）
        for (const [dbId, state] of Object.entries(currentStates)) {
          const stateManager = new StateManager("./state", dbId);
          await stateManager.saveState(state);
        }
        
        console.log("✅ Incremental report generation completed!");
        process.exit(0);
      }
    }

    console.log("ℹ️  No incremental changes detected");
    console.log(`has-incremental-changes=false`);
    console.log(`incremental-report-file=`);
    console.log(`changes-summary=No new changes detected`);
    
    process.exit(0);

  } catch (error: any) {
    console.error("❌ Error during incremental report generation:");
    console.error(error.message);
    console.log(`has-incremental-changes=error`);
    console.log(`error-message=${error.message}`);
    process.exit(1);
  }
}

// CLI引数の解析
const args = process.argv.slice(2);
const environment = args[0];
const prBranch = args[1];

if (!environment) {
  console.error("Error: Environment parameter is required");
  process.exit(1);
}

const options: ScriptOptions = {
  environment,
  prBranch,
  outputDir: './reports'
};

generateIncrementalReport(options);
EOF

# TypeScript実行
echo "🔧 Executing incremental report generation..."
npx tsx ./temp-incremental-report-generator.ts "$ENVIRONMENT" "$PR_BRANCH"

# 一時ファイルのクリーンアップ
rm -f ./temp-incremental-report-generator.ts

echo "✅ Incremental report generation script completed"