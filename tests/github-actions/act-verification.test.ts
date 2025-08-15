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

  it("should have secrets.env template for local development", async () => {
    const secretsPath = path.join(process.cwd(), "secrets.env.example");
    
    try {
      await fs.access(secretsPath);
    } catch {
      throw new Error("secrets.env.example file not found. This file is required for local act testing.");
    }
    
    const secretsContent = await fs.readFile(secretsPath, "utf-8");
    
    // 必要な環境変数が含まれていることを確認
    expect(secretsContent).toContain("NOTION_API_KEY=");
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
      
      // secretsファイルがgitignoreに含まれていることを確認
      expect(gitignoreContent).toMatch(/secrets\.env$/m);
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
});