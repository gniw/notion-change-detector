import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 増分更新対応ワークフローのテストスイート
 * 
 * テスト対象:
 * - 既存PR更新時の増分レポート生成フロー
 * - 新規PR作成時の通常レポート生成フロー
 * - 差分がない場合のスキップロジック
 * - エラーハンドリングとフォールバック
 */

describe("Workflow Incremental Updates", () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PR作成・更新判定ロジック", () => {
    it("新規PR作成の場合は通常のレポート生成を実行", async () => {
      const mockWorkflowContext = {
        prCheckResult: {
          action: "create_new",
          existingPRCount: 0
        },
        environment: "test",
        hasChanges: true
      };

      const expectedFlow = determineWorkflowFlow(mockWorkflowContext);

      expect(expectedFlow.reportType).toBe("full");
      expect(expectedFlow.prAction).toBe("create_new");
      expect(expectedFlow.shouldGenerateReport).toBe(true);
      expect(expectedFlow.shouldRunIncrementalCheck).toBe(false);
    });

    it("既存PR更新の場合は増分レポート生成を実行", async () => {
      const mockWorkflowContext = {
        prCheckResult: {
          action: "update_existing",
          existingPRCount: 1,
          targetPRBranch: "test-notion-changes-20250815-123456"
        },
        environment: "test",
        hasChanges: true
      };

      const expectedFlow = determineWorkflowFlow(mockWorkflowContext);

      expect(expectedFlow.reportType).toBe("incremental");
      expect(expectedFlow.prAction).toBe("update_existing");
      expect(expectedFlow.shouldGenerateReport).toBe(true);
      expect(expectedFlow.shouldRunIncrementalCheck).toBe(true);
      expect(expectedFlow.previousStateBranch).toBe("test-notion-changes-20250815-123456");
    });

    it("変更がない場合はレポート生成をスキップ", async () => {
      const mockWorkflowContext = {
        prCheckResult: {
          action: "create_new",
          existingPRCount: 0
        },
        environment: "test",
        hasChanges: false
      };

      const expectedFlow = determineWorkflowFlow(mockWorkflowContext);

      expect(expectedFlow.shouldGenerateReport).toBe(false);
      expect(expectedFlow.shouldRunIncrementalCheck).toBe(false);
      expect(expectedFlow.skipReason).toBe("no_changes");
    });
  });

  describe("増分レポート生成フロー", () => {
    it("既存PRから前回stateを読み込んで差分レポートを生成", async () => {
      const mockSteps = {
        loadPreviousState: vi.fn().mockResolvedValue({
          "db-1": { lastSync: "2025-08-14T10:00:00Z", pages: [{ id: "page-1" }] }
        }),
        generateCurrentState: vi.fn().mockResolvedValue({
          "db-1": { lastSync: "2025-08-15T10:00:00Z", pages: [{ id: "page-1" }, { id: "page-2" }] }
        }),
        generateIncrementalReport: vi.fn().mockResolvedValue({
          hasChanges: true,
          reportFile: "incremental-test-2025-08-15.md",
          summary: "1 new change detected"
        })
      };

      const result = await executeIncrementalReportFlow(
        "test-notion-changes-20250815-123456",
        "test",
        mockSteps
      );

      expect(mockSteps.loadPreviousState).toHaveBeenCalledWith("test-notion-changes-20250815-123456");
      expect(mockSteps.generateCurrentState).toHaveBeenCalledWith("test");
      expect(mockSteps.generateIncrementalReport).toHaveBeenCalled();
      expect(result.action).toBe("incremental_report_generated");
      expect(result.reportFile).toBe("incremental-test-2025-08-15.md");
    });

    it("前回stateが読み込めない場合は通常レポートにフォールバック", async () => {
      const mockSteps = {
        loadPreviousState: vi.fn().mockResolvedValue(null),
        generateCurrentState: vi.fn().mockResolvedValue({
          "db-1": { lastSync: "2025-08-15T10:00:00Z", pages: [{ id: "page-1" }] }
        }),
        generateFullReport: vi.fn().mockResolvedValue({
          reportFile: "fallback-full-report.md"
        })
      };

      const result = await executeIncrementalReportFlow(
        "test-notion-changes-20250815-123456", 
        "test",
        mockSteps
      );

      expect(result.action).toBe("fallback_to_full_report");
      expect(result.reason).toBe("previous_state_unavailable");
      expect(mockSteps.generateFullReport).toHaveBeenCalled();
    });

    it("差分がない場合はPR更新をスキップ", async () => {
      const mockSteps = {
        loadPreviousState: vi.fn().mockResolvedValue({
          "db-1": { lastSync: "2025-08-15T10:00:00Z", pages: [{ id: "page-1" }] }
        }),
        generateCurrentState: vi.fn().mockResolvedValue({
          "db-1": { lastSync: "2025-08-15T10:00:00Z", pages: [{ id: "page-1" }] }
        }),
        generateIncrementalReport: vi.fn().mockResolvedValue({
          hasChanges: false,
          reportFile: null,
          summary: "No new changes detected"
        })
      };

      const result = await executeIncrementalReportFlow(
        "test-notion-changes-20250815-123456",
        "test", 
        mockSteps
      );

      expect(result.action).toBe("no_incremental_changes");
      expect(result.summary).toBe("No new changes detected");
    });
  });

  describe("ワークフローステップの条件分岐", () => {
    it("新規PR作成時は従来のステップを実行", () => {
      const workflowSteps = generateWorkflowSteps({
        prAction: "create_new",
        reportType: "full",
        environment: "test"
      });

      expect(workflowSteps).toContain("generate-branch-name");
      expect(workflowSteps).toContain("create-branch");
      expect(workflowSteps).toContain("generate-full-report");
      expect(workflowSteps).toContain("commit-changes-new-pr");
      expect(workflowSteps).toContain("push-changes-new-pr");
      expect(workflowSteps).toContain("create-new-pull-request");
      
      expect(workflowSteps).not.toContain("load-previous-state");
      expect(workflowSteps).not.toContain("generate-incremental-report");
      expect(workflowSteps).not.toContain("update-existing-pr");
    });

    it("既存PR更新時は増分更新ステップを実行", () => {
      const workflowSteps = generateWorkflowSteps({
        prAction: "update_existing",
        reportType: "incremental",
        environment: "test",
        targetPRBranch: "test-notion-changes-20250815-123456"
      });

      expect(workflowSteps).toContain("load-previous-state");
      expect(workflowSteps).toContain("generate-incremental-report");
      expect(workflowSteps).toContain("checkout-existing-branch");
      expect(workflowSteps).toContain("commit-incremental-changes");
      expect(workflowSteps).toContain("push-to-existing-branch");
      expect(workflowSteps).toContain("update-existing-pull-request");
      
      expect(workflowSteps).not.toContain("generate-branch-name");
      expect(workflowSteps).not.toContain("create-branch");
      expect(workflowSteps).not.toContain("generate-full-report");
      expect(workflowSteps).not.toContain("create-new-pull-request");
    });

    it("差分なし時は全てのPR関連ステップをスキップ", () => {
      const workflowSteps = generateWorkflowSteps({
        prAction: "skip",
        reportType: "none",
        environment: "test",
        skipReason: "no_incremental_changes"
      });

      expect(workflowSteps).toContain("incremental-check-summary");
      expect(workflowSteps).not.toContain("commit-changes");
      expect(workflowSteps).not.toContain("push-changes");
      expect(workflowSteps).not.toContain("create-pull-request");
      expect(workflowSteps).not.toContain("update-pull-request");
    });
  });

  describe("エラーハンドリング", () => {
    it("増分レポート生成エラー時は通常レポートにフォールバック", async () => {
      const mockSteps = {
        loadPreviousState: vi.fn().mockResolvedValue({}),
        generateCurrentState: vi.fn().mockResolvedValue({}),
        generateIncrementalReport: vi.fn().mockRejectedValue(new Error("Incremental report failed")),
        generateFullReport: vi.fn().mockResolvedValue({ reportFile: "fallback.md" })
      };

      const result = await executeIncrementalReportFlow(
        "test-branch",
        "test",
        mockSteps
      );

      expect(result.action).toBe("fallback_to_full_report");
      expect(result.reason).toBe("incremental_report_error");
      expect(mockSteps.generateFullReport).toHaveBeenCalled();
    });

    it("Git操作エラー時は適切なエラーメッセージを出力", async () => {
      const mockSteps = {
        loadPreviousState: vi.fn().mockRejectedValue(new Error("Git fetch failed")),
        generateFullReport: vi.fn().mockResolvedValue({ reportFile: "error-fallback.md" })
      };

      const result = await executeIncrementalReportFlow(
        "invalid-branch",
        "test",
        mockSteps
      );

      expect(result.action).toBe("fallback_to_full_report");
      expect(result.reason).toBe("git_error");
      expect(result.error).toContain("Git fetch failed");
    });
  });

  describe("GitHub Actions出力変数", () => {
    it("増分レポート生成成功時は適切な出力変数を設定", () => {
      const reportResult = {
        action: "incremental_report_generated",
        reportFile: "incremental-test-2025-08-15.md",
        summary: "5 new changes detected",
        hasChanges: true
      };

      const outputs = generateGitHubActionsOutputs(reportResult);

      expect(outputs).toEqual({
        "report-type": "incremental",
        "has-incremental-changes": "true",
        "incremental-report-file": "incremental-test-2025-08-15.md",
        "changes-summary": "5 new changes detected",
        "workflow-action": "update_existing_pr"
      });
    });

    it("差分なし時は適切なスキップ情報を出力", () => {
      const reportResult = {
        action: "no_incremental_changes",
        summary: "No new changes detected",
        hasChanges: false
      };

      const outputs = generateGitHubActionsOutputs(reportResult);

      expect(outputs).toEqual({
        "report-type": "none",
        "has-incremental-changes": "false",
        "incremental-report-file": "",
        "changes-summary": "No new changes detected",
        "workflow-action": "skip_pr_update"
      });
    });
  });
});

// テスト対象となる実装関数のインターface定義

interface WorkflowContext {
  prCheckResult: {
    action: "create_new" | "update_existing" | "error";
    existingPRCount: number;
    targetPRBranch?: string;
  };
  environment: string;
  hasChanges: boolean;
}

interface WorkflowFlow {
  reportType: "full" | "incremental" | "none";
  prAction: "create_new" | "update_existing" | "skip";
  shouldGenerateReport: boolean;
  shouldRunIncrementalCheck: boolean;
  previousStateBranch?: string;
  skipReason?: string;
}

// テスト用のスタブ実装
function determineWorkflowFlow(context: WorkflowContext): WorkflowFlow {
  if (!context.hasChanges) {
    return {
      reportType: "none",
      prAction: "skip",
      shouldGenerateReport: false,
      shouldRunIncrementalCheck: false,
      skipReason: "no_changes"
    };
  }

  if (context.prCheckResult.action === "create_new") {
    return {
      reportType: "full",
      prAction: "create_new",
      shouldGenerateReport: true,
      shouldRunIncrementalCheck: false
    };
  }

  if (context.prCheckResult.action === "update_existing") {
    return {
      reportType: "incremental",
      prAction: "update_existing",
      shouldGenerateReport: true,
      shouldRunIncrementalCheck: true,
      previousStateBranch: context.prCheckResult.targetPRBranch
    };
  }

  throw new Error(`Unsupported PR action: ${context.prCheckResult.action}`);
}

async function executeIncrementalReportFlow(branchName: string, environment: string, steps: any) {
  try {
    const previousState = await steps.loadPreviousState(branchName);
    
    if (!previousState) {
      await steps.generateFullReport?.();
      return {
        action: "fallback_to_full_report",
        reason: "previous_state_unavailable"
      };
    }

    const currentState = await steps.generateCurrentState(environment);
    const reportResult = await steps.generateIncrementalReport(previousState, currentState);

    if (!reportResult.hasChanges) {
      return {
        action: "no_incremental_changes",
        summary: reportResult.summary
      };
    }

    return {
      action: "incremental_report_generated",
      reportFile: reportResult.reportFile,
      summary: reportResult.summary
    };

  } catch (error: any) {
    if (error.message.includes("Git")) {
      await steps.generateFullReport?.();
      return {
        action: "fallback_to_full_report",
        reason: "git_error",
        error: error.message
      };
    }

    await steps.generateFullReport?.();
    return {
      action: "fallback_to_full_report", 
      reason: "incremental_report_error"
    };
  }
}

function generateWorkflowSteps(config: any): string[] {
  const steps: string[] = [];

  if (config.prAction === "create_new") {
    steps.push(
      "generate-branch-name",
      "create-branch", 
      "generate-full-report",
      "commit-changes-new-pr",
      "push-changes-new-pr",
      "create-new-pull-request"
    );
  } else if (config.prAction === "update_existing") {
    steps.push(
      "load-previous-state",
      "generate-incremental-report",
      "checkout-existing-branch",
      "commit-incremental-changes",
      "push-to-existing-branch",
      "update-existing-pull-request"
    );
  } else if (config.prAction === "skip") {
    steps.push("incremental-check-summary");
  }

  return steps;
}

function generateGitHubActionsOutputs(result: any): Record<string, string> {
  if (result.action === "incremental_report_generated") {
    return {
      "report-type": "incremental",
      "has-incremental-changes": "true",
      "incremental-report-file": result.reportFile,
      "changes-summary": result.summary,
      "workflow-action": "update_existing_pr"
    };
  }

  if (result.action === "no_incremental_changes") {
    return {
      "report-type": "none",
      "has-incremental-changes": "false",
      "incremental-report-file": "",
      "changes-summary": result.summary,
      "workflow-action": "skip_pr_update"
    };
  }

  return {};
}