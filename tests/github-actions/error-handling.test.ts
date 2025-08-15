import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

describe("Error Handling", () => {
  const workflowPath = path.join(process.cwd(), ".github/workflows/notion-changes.yml");

  it("workflow should have retry logic for Notion API failures", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    const changeDetectionStep = mainJob.steps.find((step: any) => 
      step.name === "Run Notion change detection"
    );

    // リトライ機能があることを確認
    const retryStep = mainJob.steps.find((step: any) => 
      step.name === "Retry on API failure" || 
      (step.uses && step.uses.includes("retry"))
    );

    // continue-on-errorが設定されているか、リトライステップがあることを確認
    const hasRetryMechanism = 
      changeDetectionStep["continue-on-error"] !== undefined ||
      retryStep !== undefined ||
      changeDetectionStep.run.includes("retry") ||
      changeDetectionStep.run.includes("attempt");

    expect(hasRetryMechanism).toBe(true);
  });

  it("workflow should handle git operation failures gracefully", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // Git操作が失敗した場合のエラーハンドリングがあることを確認
    const gitSteps = mainJob.steps.filter((step: any) => 
      step.run && (
        step.run.includes("git ") ||
        step.run.includes("gh pr create")
      )
    );

    expect(gitSteps.length).toBeGreaterThan(0);

    // 少なくとも1つのGit関連ステップにエラーハンドリングがあることを確認
    const hasErrorHandling = gitSteps.some((step: any) => 
      step["continue-on-error"] !== undefined ||
      (step.run && (
        step.run.includes("|| echo") ||
        step.run.includes("|| true") ||
        step.run.includes("if [ $? ")
      ))
    );

    expect(hasErrorHandling).toBe(true);
  });

  it("workflow should prevent duplicate PR creation", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // 重複PR防止のチェックステップが存在することを確認
    const duplicateCheckStep = mainJob.steps.find((step: any) => 
      step.name === "Check for existing PR" ||
      step.name === "Check duplicate PR" ||
      (step.run && step.run.includes("gh pr list"))
    );

    expect(duplicateCheckStep).toBeDefined();
    expect(duplicateCheckStep.run).toContain("gh pr list");
  });

  it("workflow should have proper failure notifications", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // 失敗時の通知ステップが存在することを確認
    const notificationStep = mainJob.steps.find((step: any) => 
      step.name && step.name.includes("failure") ||
      (step.if && step.if.includes("failure()"))
    );

    expect(notificationStep).toBeDefined();
    expect(notificationStep.if).toContain("failure()");
  });

  it("workflow should validate environment before execution", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // 環境検証ステップが存在することを確認
    const validationStep = mainJob.steps.find((step: any) => 
      step.name === "Validate environment" ||
      step.name === "Check prerequisites"
    );

    expect(validationStep).toBeDefined();
    expect(validationStep.run).toMatch(/NOTION_API_KEY|environment/);
  });

  it("workflow should handle empty or no changes gracefully", async () => {
    const workflowContent = await fs.readFile(workflowPath, "utf-8");
    const workflow = yaml.load(workflowContent) as any;

    const mainJob = workflow.jobs["notion-changes"];
    
    // 変更なしの場合の処理があることを確認
    const noChangesStep = mainJob.steps.find((step: any) => 
      step.name === "Handle no changes" ||
      (step.if && step.if.includes("has-changes") && step.if.includes("false"))
    );

    expect(noChangesStep).toBeDefined();
  });
});