# Notion データベース変更検出システム仕様書

## 1. システム概要

### 1.1 プロジェクト名
**Notion Change Detector** - Notion データベース変更自動検出・PR作成システム

### 1.2 目的
Notion データベースの変更を自動的に検出し、GitHub Actions で定期実行して詳細なレポートと共に Pull Request を作成するシステム。TDD（テスト駆動開発）ベースで開発されており、継続的な変更監視とチーム通知を実現する。

### 1.3 システム特徴
- **自動化**: 毎日定時実行による変更検出の自動化
- **インクリメンタル更新**: 既存PR への差分追加機能
- **詳細レポート**: 日本語での構造化された変更レポート
- **堅牢性**: 完全な TypeScript 型安全性とテストカバレッジ

## 2. アーキテクチャ設計

### 2.1 システム構成
```
notion-change-detector/
├── scripts/notion/          # メインアプリケーション
│   ├── config/              # 設定管理
│   ├── markdown/            # レポート生成
│   ├── notion/              # Notion API統合
│   └── storage/             # 状態管理
├── .github/workflows/       # GitHub Actions
├── tests/                   # テストスイート
└── docs/                    # ドキュメント
```

### 2.2 技術スタック
- **Runtime**: Node.js 20+ 
- **言語**: TypeScript (strict mode)
- **API**: Notion SDK v2.2.0
- **テスト**: Vitest + TDD
- **CI/CD**: GitHub Actions
- **Linting**: Biome

### 2.3 外部依存関係
- `@notionhq/client`: Notion API クライアント
- `dotenv`: 環境変数管理  
- GitHub Actions ランナー環境

## 3. 機能仕様

### 3.1 Notion API 統合

#### 3.1.1 データベース設定管理
**設定ファイル**: `notion-databases.json`
```json
{
  "databases": [
    {
      "id": "database-uuid",
      "name": "データベース名",
      "description": "説明",
      "enabled": true
    }
  ]
}
```

**仕様**:
- 複数データベース対応
- 個別有効/無効制御
- 本番環境専用構成（テスト環境サポート削除済み）

#### 3.1.2 プロパティ抽出システム
**実装**: `PropertyExtractor` クラス

**機能**:
- Notion の複雑なプロパティ構造を平坦化
- 全プロパティ型に対応（title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, formula, relation, rollup, created_time, created_by, last_edited_time, last_edited_by）
- 比較可能な形式への正規化

**テストケース例**:
```typescript
it("title プロパティを正しく抽出する", () => {
  const property = { type: "title", title: [{ plain_text: "テストタイトル" }] };
  const result = extractor.extractProperty("Title", property);
  expect(result).toBe("テストタイトル");
});
```

### 3.2 変更検出システム

#### 3.2.1 状態管理
**実装**: `StateManager` クラス

**機能**:
- 前回取得データの JSON ファイル永続化
- データベース毎の個別状態管理
- 状態ファイルの自動生成・更新

**ファイル形式**:
```json
{
  "lastSync": "2025-08-18T05:42:55.419Z",
  "pages": [
    {
      "id": "page-uuid",
      "last_edited_time": "2025-08-15T05:10:00.000Z",
      "properties": { /* 抽出されたプロパティ */ }
    }
  ]
}
```

#### 3.2.2 差分検出
**実装**: `NotionDiffer` クラス

**検出対象**:
1. **新規追加** - 前回にないページの検出
2. **更新** - `last_edited_time` 変更またはプロパティ変更
3. **削除** - 現在取得データにないページの検出
4. **プロパティ変更** - 個別プロパティレベルの差分追跡

**テストケース**:
```typescript
it("プロパティが変更されたページを正しく検出する", () => {
  const previousPages = [{
    id: "page-1",
    properties: { Name: "Old Title", Status: "In Progress" }
  }];
  const currentPages = [{
    id: "page-1", 
    properties: { Name: "New Title", Status: "In Progress" }
  }];
  
  const result = differ.detectPageChanges(previousPages, currentPages, "db-1", "Test DB");
  
  expect(result.changes[0].propertyChanges).toEqual([{
    propertyName: "Name",
    previousValue: "Old Title", 
    currentValue: "New Title"
  }]);
});
```

### 3.3 マークダウンレポート生成

#### 3.3.1 レポート構造
**実装**: `MarkdownGenerator` クラス

**生成形式**:
```markdown
# Notion データベース変更レポート
**レポート生成日時**: 2025-08-18T05:42:55.419Z

## 📊 全体サマリー
- **追加**: 12件
- **更新**: 3件  
- **削除**: 1件
- **合計変更数**: 16件

### データベース別サマリー
| データベース名 | 追加 | 更新 | 削除 | 合計 |
|---|---|---|---|---|
| 注文管理 | 3 | 1 | 0 | 4 |

## 📋 データベース詳細

### 注文管理

#### 📝 追加されたページ (3件)
- page-uuid (2025-08-15 05:10)
  **初期プロパティ:**
  | プロパティ名 | 設定値 |
  |---|---|
  | **注文日** | "2025-08-11" |
  | **合計金額** | `3500` |
```

#### 3.3.2 日本語対応
- 完全日本語インターフェース
- 日本時間（JST）での時刻表示
- 日本語プロパティ名サポート

### 3.4 GitHub Actions 自動化

#### 3.4.1 実行スケジュール
```yaml
on:
  schedule:
    - cron: '0 0,9 * * *'  # 毎日 9:00, 18:00 JST
  workflow_dispatch:
    inputs:
      force_pr:
        type: boolean
        default: false
```

#### 3.4.2 ワークフロー手順
1. **環境検証** - `NOTION_API_KEY` の存在確認
2. **依存関係インストール** - `npm ci`
3. **変更検出実行** - `npm run generate-report`
4. **重複PR検査** - 既存PR の確認
5. **分岐処理**:
   - 新規PR作成
   - 既存PR インクリメンタル更新

#### 3.4.3 PR管理機能

**新規PR作成**:
```yaml
- name: Push branch and create PR (New PR)
  run: |
    git push origin ${{ steps.branch-name.outputs.name }}
    gh pr create --title "feat: update Notion database changes - $(date)" --body-file /tmp/pr_body.md
```

**インクリメンタル更新**:
```yaml
- name: Update existing PR (Incremental Changes)
  run: |
    # untracked files 競合回避
    git add reports/ state/ --force
    git stash push -u -m "Temp stash before incremental update"
    
    # 既存PRブランチチェックアウト
    git checkout -B ${{ target_pr_branch }} origin/${{ target_pr_branch }}
    git stash pop
    
    # インクリメンタル変更をコミット
    git commit -m "feat: add incremental Notion database changes"
    gh pr edit "${{ target_pr_number }}" --body-file /tmp/pr_update_body.md
```

### 3.5 インクリメンタル更新機能

#### 3.5.1 重複PR検出
**実装**: `scripts/check-duplicate-prs.sh`

```bash
EXISTING_PRS=$(gh pr list --state open --search "feat: update Notion database changes")
if [ "$PR_COUNT" -gt 0 ]; then
  echo "action=update_existing" >> $GITHUB_OUTPUT
else
  echo "action=create_new" >> $GITHUB_OUTPUT  
fi
```

#### 3.5.2 差分ベース更新
**テスト仕様**:
```typescript
describe("Incremental PR Updates", () => {
  it("前回stateと現在stateを比較して差分のみを抽出する", () => {
    const delta = calculateStateDelta(prevState, currentState);
    expect(delta.hasChanges).toBe(true);
    expect(delta.changedPages).toHaveLength(2); // 2つの変更のみ
  });
});
```

**利点**:
- 既存PR への段階的変更追加
- 重複コンテンツの除外
- PR履歴の保持

## 4. テスト戦略

### 4.1 TDD アプローチ
- **Red**: 失敗するテストを先に作成
- **Green**: 最小限の実装でテストを通す  
- **Refactor**: 品質向上のためのリファクタリング

### 4.2 テストカバレッジ
**Unit Tests**: 17ファイル、505個のテストケース
- `notion/differ.test.ts`: 差分検出ロジック
- `notion/property-extractor.test.ts`: プロパティ抽出
- `markdown/generator.test.ts`: レポート生成
- `storage/state-manager.test.ts`: 状態管理
- `github-actions/incremental-pr-updates.test.ts`: PR更新機能

**Integration Tests**:
- `multi-databases.integration.test.ts`: 複数DB統合
- `diff-and-markdown.integration.test.ts`: E2E変更検出

### 4.3 Act によるローカルテスト
```bash
npm run test:act
act workflow_dispatch --input force_pr=true -W .github/workflows/notion-changes.yml
```

**検証項目**:
- ✅ 変更検出ロジック
- ✅ レポート生成
- ✅ ブランチ作成  
- ✅ 重複PR検査
- ✅ コミット処理
- ❌ GitHub push（ローカル制限により正常）

## 5. 運用仕様

### 5.1 環境変数
```bash
NOTION_API_KEY=secret_***  # Notion integration token
```

### 5.2 ファイル管理
**生成ファイル**:
- `reports/notion-changes-YYYY-MM-DD-HHMMSS.md`: 変更レポート
- `state/*.json`: データベース状態ファイル

**除外ファイル**:
- `*.bak`: バックアップファイル（.gitignore）
- `reports/`, `test-reports/`: 生成レポート

### 5.3 エラーハンドリング
- API レート制限対応
- 認証失敗時の適切なエラーメッセージ
- 部分的障害時の継続実行

### 5.4 セキュリティ考慮事項
- API キーの GitHub Secrets 管理
- 最小権限の原則
- センシティブデータのログ除外

## 6. 拡張性・将来計画

### 6.1 実装済み機能
- ✅ 複数データベース対応
- ✅ インクリメンタルPR更新
- ✅ 日本語レポート生成
- ✅ 完全なTypeScript型安全性
- ✅ Biome による品質管理

### 6.2 将来的な拡張ポイント
- Slack/Teams 通知連携
- カスタムフィルタリング機能
- レポートテンプレートのカスタマイズ
- API 使用量監視・最適化

## 7. 開発・運用ガイド

### 7.1 開発コマンド
```bash
npm run test              # 全テスト実行
npm run test:watch        # ウォッチモード
npm run test:coverage     # カバレッジレポート
npm run build             # TypeScript コンパイル
npm run dev               # 開発モード実行
npm run lint              # コード品質チェック
```

### 7.2 本番デプロイ
1. `notion-databases.json` の設定
2. GitHub Secrets の `NOTION_API_KEY` 設定
3. ワークフロー有効化

### 7.3 トラブルシューティング
- **変更検出されない**: Notion API キー・データベースID確認
- **PR作成失敗**: GitHub token 権限確認
- **untracked files エラー**: ワークフロー内で自動解決済み

---

**本仕様書は TDD ベースの実装と包括的なテストスイートに基づいて作成されており、システムの信頼性と保守性を保証するものです。**