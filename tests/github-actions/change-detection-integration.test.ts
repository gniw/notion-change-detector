import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

describe("Change Detection Integration", () => {
  const workflowPath = path.join(process.cwd(), ".github/workflows/notion-changes.yml");

  it("workflow should have change detection step with proper output", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    const changeDetectionStep = mainJob.steps.find((step: any) => 
      step.name === "Run Notion change detection"
    );

    expect(changeDetectionStep).toBeDefined();
    expect(changeDetectionStep.id).toBe("detect-changes");
    
    // ステップが変更検知結果を出力することを確認
    expect(changeDetectionStep.run).toContain("npm run generate-report");
  });

  it("workflow should check for changes and set output", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // 変更検知結果をチェックするステップが存在することを確認
    const checkChangesStep = mainJob.steps.find((step: any) => 
      step.name === "Check for changes"
    );

    expect(checkChangesStep).toBeDefined();
    expect(checkChangesStep.id).toBe("check-changes");
    
    // 変更があったかどうかを判定するロジックが含まれていることを確認
    expect(checkChangesStep.run).toMatch(/reports.*\.md/);
    expect(checkChangesStep.run).toContain("GITHUB_OUTPUT");
  });

  it("workflow should have conditional PR creation step", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // PR作成ステップが条件付きで実行されることを確認
    const prSteps = mainJob.steps.filter((step: any) => 
      step.name && (
        step.name.includes("Create branch") || 
        step.name.includes("Create pull request") ||
        step.name.includes("Commit changes")
      )
    );

    expect(prSteps.length).toBeGreaterThan(0);
    
    // 少なくとも1つのPR関連ステップに条件が設定されていることを確認
    const hasConditionalStep = prSteps.some((step: any) => 
      step.if && (
        step.if.includes("steps.check-changes.outputs.has-changes") ||
        step.if.includes("inputs.force_pr")
      )
    );
    
    expect(hasConditionalStep).toBe(true);
  });

  it("workflow should handle force_pr input correctly", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // force_pr入力を考慮した条件分岐があることを確認
    const conditionalSteps = mainJob.steps.filter((step: any) => 
      step.if && step.if.includes("inputs.force_pr")
    );

    expect(conditionalSteps.length).toBeGreaterThan(0);
  });

  it("workflow should have git configuration for commits", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // Git設定ステップが存在することを確認
    const gitConfigStep = mainJob.steps.find((step: any) => 
      step.name === "Configure Git"
    );

    expect(gitConfigStep).toBeDefined();
    expect(gitConfigStep.run).toContain("git config user.name");
    expect(gitConfigStep.run).toContain("git config user.email");
  });

  it("workflow should generate unique branch names", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // ブランチ名生成ステップが存在することを確認
    const branchStep = mainJob.steps.find((step: any) => 
      step.name === "Generate branch name"
    );

    expect(branchStep).toBeDefined();
    expect(branchStep.id).toBe("branch-name");
    expect(branchStep.run).toContain("notion-changes-");
    expect(branchStep.run).toContain("date");
    expect(branchStep.run).toContain("GITHUB_OUTPUT");
  });
});