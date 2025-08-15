import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

describe("GitHub Actions Workflow Validation", () => {
  const workflowPath = path.join(process.cwd(), ".github/workflows/notion-changes.yml");

  it("workflow file should exist", async () => {
    try {
      await fs.access(workflowPath);
    } catch {
      throw new Error(`Workflow file not found at ${workflowPath}`);
    }
  });

  it("workflow file should be valid YAML", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    
    expect(() => {
      yaml.load(workflowContent);
    }).not.toThrow();
  });

  it("workflow should have required structure", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    // 基本構造の検証
    expect(workflow).toHaveProperty("name");
    expect(workflow).toHaveProperty("on");
    expect(workflow).toHaveProperty("jobs");

    // トリガーの検証
    expect(workflow.on).toHaveProperty("schedule");
    expect(workflow.on).toHaveProperty("workflow_dispatch");

    // スケジュールの検証（毎日9時と18時 JST = 0時と9時 UTC）
    expect(workflow.on.schedule).toEqual([
      { cron: "0 0,9 * * *" }
    ]);

    // workflow_dispatchの入力パラメータ検証
    expect(workflow.on.workflow_dispatch).toHaveProperty("inputs");
    expect(workflow.on.workflow_dispatch.inputs).toHaveProperty("force_pr");
    expect(workflow.on.workflow_dispatch.inputs.force_pr.type).toBe("boolean");
    expect(workflow.on.workflow_dispatch.inputs.force_pr.default).toBe(false);
  });

  it("workflow should have required permissions", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    expect(workflow).toHaveProperty("permissions");
    expect(workflow.permissions).toHaveProperty("contents");
    expect(workflow.permissions).toHaveProperty("pull-requests");
    expect(workflow.permissions.contents).toBe("write");
    expect(workflow.permissions["pull-requests"]).toBe("write");
  });

  it("workflow should have main job with correct runner", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    expect(workflow.jobs).toHaveProperty("notion-changes");
    const mainJob = workflow.jobs["notion-changes"];
    
    expect(mainJob).toHaveProperty("runs-on");
    expect(mainJob["runs-on"]).toBe("ubuntu-latest");
  });

  it("workflow should have required steps", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    expect(mainJob).toHaveProperty("steps");
    expect(Array.isArray(mainJob.steps)).toBe(true);
    
    const steps = mainJob.steps;
    const stepNames = steps.map((step: any) => step.name || step.uses);

    // 必須ステップの存在確認
    expect(stepNames).toContain("Checkout repository");
    expect(stepNames.some((name: string) => name && name.toLowerCase().includes("setup") && name.toLowerCase().includes("node"))).toBe(true);
    expect(stepNames).toContain("Install dependencies");
    expect(stepNames).toContain("Run Notion change detection");
  });

  it("workflow should use correct Node.js version", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    const nodeStep = mainJob.steps.find((step: any) => 
      step.uses && step.uses.includes("setup-node")
    );

    expect(nodeStep).toBeDefined();
    expect(nodeStep.with).toHaveProperty("node-version");
    expect(parseInt(nodeStep.with["node-version"])).toBeGreaterThanOrEqual(18);
  });

  it("workflow should have environment variables setup", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // env が job レベルまたは step レベルで定義されている
    const hasEnv = Boolean(mainJob.env) || mainJob.steps.some((step: any) => step.env);
    expect(hasEnv).toBe(true);

    // NOTION_API_KEY の設定確認
    if (mainJob.env) {
      expect(mainJob.env).toHaveProperty("NOTION_API_KEY");
      expect(mainJob.env.NOTION_API_KEY).toBe("${{ secrets.NOTION_API_KEY }}");
    } else {
      // step レベルで確認
      const stepWithEnv = mainJob.steps.find((step: any) => step.env && step.env.NOTION_API_KEY);
      expect(stepWithEnv).toBeDefined();
      expect(stepWithEnv.env.NOTION_API_KEY).toBe("${{ secrets.NOTION_API_KEY }}");
    }
  });
});