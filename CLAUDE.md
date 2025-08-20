# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TDD-based Node.js TypeScript project that detects changes in Notion databases and creates GitHub Pull Requests with change summaries. The system is designed to run daily and automatically manage PR lifecycle.

## Development Commands

- `npm run test` - Run all unit tests once (uses `vitest run`)
- `npm run test:watch` - Run unit tests in watch mode for development
- `npm run test:coverage` - Generate test coverage reports
- `npm run test:integration` - Run integration tests with actual Notion API (requires API key and database configuration)
- `npm run build` - Compile TypeScript to JavaScript output in `dist/`
- `npm run start` - Run the compiled application from `dist/index.js`
- `npm run dev` - Run TypeScript directly with tsx for development

## Architecture Overview

The project follows a modular architecture with implemented structure:

```
scripts/notion/
├── config/          # Database configuration management
├── markdown/        # Markdown report generation
├── notion/          # Notion API client and operations
├── storage/         # State management and persistence
└── index.ts         # Main application entry point
```

**詳細仕様**: プロジェクトの完全な仕様は `SPECIFICATIONS.md` を参照してください。

## Environment Configuration

Environment variables are managed through `.env.local` (gitignored):
- `NOTION_API_KEY` - Notion integration token
- Additional variables will include GitHub token and repository configuration

Database configuration is managed through `notion-databases.json`:
- Multiple database support with enable/disable control
- Each database has id, name, description, and enabled status
- Only enabled databases are processed during execution

## TypeScript Configuration

The project uses strict TypeScript with ES2022 modules:
- `strictNullChecks`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` enabled
- Output directory: `dist/`
- Test files excluded from compilation

## Testing Setup

- **Framework**: Vitest with Node.js environment
- **Coverage**: Text, JSON, and HTML reporters configured
- **Globals**: Enabled for test files
- Test files use `.test.ts` or `.spec.ts` extension

## Key Dependencies

- `@notionhq/client` - Official Notion API client
- `dotenv` - Environment variable management
- Development dependencies include TypeScript toolchain and Vitest

## Development Approach

This project follows Test-Driven Development (TDD):
1. Write failing tests first
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Focus on one feature/module at a time

## Current Implementation Status

✅ **完了済み機能**:
- Notion API 統合とデータ取得
- 変更検出システム（追加・更新・削除）
- プロパティレベル差分追跡
- 日本語マークダウンレポート生成
- GitHub Actions 自動化
- インクリメンタルPR更新機能
- 完全なテストカバレッジ（505テストケース）

## References

- **完全仕様書**: `SPECIFICATIONS.md` - システム全体の詳細仕様
- **GitHub Actions設定**: `.github/workflows/notion-changes.yml`
- **テストスイート**: `tests/` - TDDベースの包括的テスト

## Commit Guidelines

- コミットメッセージはConventionalCommitsに則り、英語で記述する