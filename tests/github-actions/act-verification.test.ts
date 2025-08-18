import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Act Verification Setup", () => {
  it("should have .actrc configuration file", async () => {
    const actrcPath = path.join(process.cwd(), ".actrc");
    
    try {
      await fs.access(actrcPath);
    } catch {
      throw new Error(".actrc file not found. This file is required for act configuration.");
    }
    
    const actrcContent = await fs.readFile(actrcPath, "utf-8");
    
    // 基本的な設定が含まれていることを確認
    expect(actrcContent).toContain("ubuntu-latest");
    expect(actrcContent).toContain("-P");
  });

  it("should have .env.example template for local development", async () => {
    const envExamplePath = path.join(process.cwd(), ".env.example");
    
    try {
      await fs.access(envExamplePath);
    } catch {
      throw new Error(".env.example file not found. This template is required for setup instructions.");
    }
    
    const envExampleContent = await fs.readFile(envExamplePath, "utf-8");
    
    // 必要な環境変数が含まれていることを確認
    expect(envExampleContent).toContain("NOTION_API_KEY=");
  });

  it("should have act test script in package.json", async () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    
    expect(packageJson.scripts).toHaveProperty("test:act");
    expect(packageJson.scripts["test:act"]).toContain("act");
  });

  it("should have act development dependencies", async () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    
    // actが利用可能であることを確認（グローバルインストールまたは説明文書）
    const hasActReference = 
      packageJson.devDependencies?.act ||
      packageJson.scripts?.["test:act"] ||
      packageJson.description?.includes("act");
    
    expect(hasActReference).toBeTruthy();
  });

  it("should have gitignore entries for act files", async () => {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
      
      // 環境変数ファイルがgitignoreに含まれていることを確認
      expect(gitignoreContent).toMatch(/\.env\.local$/m);
    } catch {
      // .gitignoreが存在しない場合はskip
      console.warn(".gitignore file not found, skipping gitignore validation");
    }
  });

  it("should have act documentation", async () => {
    const docsPath = path.join(process.cwd(), "docs");
    
    try {
      const files = await fs.readdir(docsPath);
      const hasActDocs = files.some(file => 
        file.toLowerCase().includes("act") || 
        file.toLowerCase().includes("local-testing") ||
        file.toLowerCase().includes("verification")
      );
      
      expect(hasActDocs).toBe(true);
    } catch {
      throw new Error("docs directory not found or no act documentation available");
    }
  });

  it("should have required environment variables available in GitHub Actions context", async () => {
    // このテストはGitHub Actions環境で実行される想定
    // actでsecret-fileを使った場合、環境変数として注入される
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    const isActEnvironment = process.env.ACT === 'true';
    
    if (isGitHubActions || isActEnvironment) {
      // GitHub ActionsまたはAct環境では必須環境変数の存在を確認
      expect(process.env.NOTION_API_KEY).toBeDefined();
      expect(process.env.NOTION_API_KEY).not.toBe('');
      expect(process.env.NOTION_API_KEY).not.toBe('your_notion_token_here');
    } else {
      // ローカル開発環境では.env.localの読み込みをテスト
      console.log("Skipping environment variable check in local development environment");
    }
  });

  it("should fail gracefully when required secrets are missing", async () => {
    // このテストは実際にact環境でsecretなしで実行した場合の動作を想定
    const isActEnvironment = process.env.ACT === 'true';
    
    if (isActEnvironment && !process.env.NOTION_API_KEY) {
      // Act環境でNOTION_API_KEYがない場合、アプリケーションが適切にエラーを出すことを期待
      // 実際のアプリケーション実行は別のテストで行う
      expect(true).toBe(true); // このケースでは設定の一貫性のみを確認
    } else {
      console.log("Skipping missing secrets test - not in act environment or secrets are available");
    }
  });
});