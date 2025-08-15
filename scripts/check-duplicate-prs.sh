#!/bin/bash

# GitHub Actions用の重複PR検出スクリプト
# Usage: ./check-duplicate-prs.sh <environment>
# Environment: GH_TOKEN が必要

set -euo pipefail

ENVIRONMENT="${1:-}"
if [ -z "$ENVIRONMENT" ]; then
    echo "Error: Environment parameter is required"
    echo "Usage: $0 <test|production>"
    exit 1
fi

# 環境名を大文字に変換
ENVIRONMENT_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')

# GitHub CLI を使用して既存PRを検索
echo "🔍 Checking for existing PRs in $ENVIRONMENT environment..."

SEARCH_QUERY="Notion Changes Report (${ENVIRONMENT_UPPER})"
PR_DATA=$(gh pr list \
    --state open \
    --search "$SEARCH_QUERY" \
    --json number,title,headRefName,createdAt \
    --limit 10 \
    2>/dev/null || echo "[]")

# JSON データから関連するPRをフィルタリング
RELEVANT_PRS=$(echo "$PR_DATA" | jq --arg env "$ENVIRONMENT_UPPER" '
    [.[] | select(.title | contains("(\($env))"))]
')

PR_COUNT=$(echo "$RELEVANT_PRS" | jq 'length')

echo "📊 Found $PR_COUNT existing PR(s) for $ENVIRONMENT environment"

# アクション決定ロジック
case "$PR_COUNT" in
    0)
        echo "action=create_new" >> $GITHUB_OUTPUT
        echo "existing_pr_count=0" >> $GITHUB_OUTPUT
        echo "✅ No duplicates found - proceeding with new PR creation"
        exit 0
        ;;
    1)
        # 既存PRの情報を取得
        EXISTING_PR=$(echo "$RELEVANT_PRS" | jq -r '.[0]')
        PR_NUMBER=$(echo "$EXISTING_PR" | jq -r '.number')
        PR_BRANCH=$(echo "$EXISTING_PR" | jq -r '.headRefName')
        PR_TITLE=$(echo "$EXISTING_PR" | jq -r '.title')
        
        echo "action=update_existing" >> $GITHUB_OUTPUT
        echo "existing_pr_count=1" >> $GITHUB_OUTPUT
        echo "target_pr_number=$PR_NUMBER" >> $GITHUB_OUTPUT
        echo "target_pr_branch=$PR_BRANCH" >> $GITHUB_OUTPUT
        echo "target_pr_title=$PR_TITLE" >> $GITHUB_OUTPUT
        
        echo "🔄 Existing PR found - will update PR #$PR_NUMBER"
        echo "   Branch: $PR_BRANCH"
        echo "   Title: $PR_TITLE"
        exit 0
        ;;
    *)
        # 複数のPRが存在する場合はエラー
        echo "action=error" >> $GITHUB_OUTPUT
        echo "existing_pr_count=$PR_COUNT" >> $GITHUB_OUTPUT
        echo "error_message=Multiple open PRs found for $ENVIRONMENT environment. Manual intervention required." >> $GITHUB_OUTPUT
        
        echo "❌ ERROR: Multiple open PRs found for $ENVIRONMENT environment"
        echo "📋 Existing PRs:"
        echo "$RELEVANT_PRS" | jq -r '.[] | "   - PR #\(.number): \(.title)"'
        echo ""
        echo "🛠️  Manual intervention required:"
        echo "   1. Close or merge redundant PRs"
        echo "   2. Re-run the workflow"
        exit 1
        ;;
esac