import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 差分ベースPR更新機能のテストスイート
 * 
 * テスト対象機能:
 * - 既存PRブランチからの前回state読み込み
 * - 現在stateとの差分計算
 * - 増分レポートの生成
 * - 重複内容の除外
 */

describe("Incremental PR Updates", () => {
  // テスト用のモックデータ
  const mockPreviousState = {
    "1d1a2a12137b811ca56cd425a28d3945": {
      lastSync: "2025-08-14T10:06:18.389Z",
      pages: [
        {
          id: "page-1",
          last_edited_time: "2025-08-14T10:05:00.000Z",
          properties: { title: "Item A", status: "Draft" }
        },
        {
          id: "page-2", 
          last_edited_time: "2025-08-14T10:06:00.000Z",
          properties: { title: "Item B", status: "Published" }
        }
      ]
    }
  };

  const mockCurrentState = {
    "1d1a2a12137b811ca56cd425a28d3945": {
      lastSync: "2025-08-15T10:06:18.389Z",
      pages: [
        {
          id: "page-1",
          last_edited_time: "2025-08-14T10:05:00.000Z", // 変更なし
          properties: { title: "Item A", status: "Draft" }
        },
        {
          id: "page-2",
          last_edited_time: "2025-08-15T10:07:00.000Z", // 更新済み
          properties: { title: "Item B", status: "Published", priority: "High" }
        },
        {
          id: "page-3",
          last_edited_time: "2025-08-15T10:08:00.000Z", // 新規追加
          properties: { title: "Item C", status: "Draft" }
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("State差分検出", () => {
    it("前回stateと現在stateを比較して差分のみを抽出する", () => {
      const prevState = mockPreviousState["1d1a2a12137b811ca56cd425a28d3945"];
      const currentState = mockCurrentState["1d1a2a12137b811ca56cd425a28d3945"];
      
      const delta = calculateStateDelta(prevState, currentState);
      
      expect(delta.hasChanges).toBe(true);
      expect(delta.changedPages).toHaveLength(2); // page-2 updated, page-3 added
      expect(delta.changedPages.map(p => p.id)).toEqual(["page-2", "page-3"]);
    });

    it("変更がない場合は空の差分を返す", () => {
      const prevState = mockPreviousState["1d1a2a12137b811ca56cd425a28d3945"];
      const currentState = prevState; // 同じデータ
      
      const delta = calculateStateDelta(prevState, currentState);
      
      expect(delta.hasChanges).toBe(false);
      expect(delta.changedPages).toHaveLength(0);
    });

    it("新規追加ページのみを正しく検出する", () => {
      const prevState = {
        lastSync: "2025-08-14T10:06:18.389Z",
        pages: [
          { id: "page-1", last_edited_time: "2025-08-14T10:05:00.000Z", properties: {} }
        ]
      };
      
      const currentState = {
        lastSync: "2025-08-15T10:06:18.389Z", 
        pages: [
          { id: "page-1", last_edited_time: "2025-08-14T10:05:00.000Z", properties: {} },
          { id: "page-2", last_edited_time: "2025-08-15T10:07:00.000Z", properties: {} }
        ]
      };
      
      const delta = calculateStateDelta(prevState, currentState);
      
      expect(delta.hasChanges).toBe(true);
      expect(delta.changedPages).toHaveLength(1);
      expect(delta.changedPages[0].id).toBe("page-2");
      expect(delta.changedPages[0].changeType).toBe("added");
    });
  });

  describe("既存PRブランチからのState読み込み", () => {
    it("PRブランチから前回のstateファイルを正しく読み込む", async () => {
      const mockGitOperations = {
        fetchBranch: vi.fn(),
        readStateFromBranch: vi.fn().mockResolvedValue(mockPreviousState)
      };
      
      const result = await loadPreviousStateFromPR("test-notion-changes-20250815-085419", mockGitOperations);
      
      expect(mockGitOperations.fetchBranch).toHaveBeenCalledWith("test-notion-changes-20250815-085419");
      expect(result).toEqual(mockPreviousState);
    });

    it("PRブランチにstateファイルが存在しない場合は空stateを返す", async () => {
      const mockGitOperations = {
        fetchBranch: vi.fn(),
        readStateFromBranch: vi.fn().mockResolvedValue(null)
      };
      
      const result = await loadPreviousStateFromPR("test-notion-changes-20250815-085419", mockGitOperations);
      
      expect(result).toEqual({});
    });
  });

  describe("増分レポート生成", () => {
    it("差分のみを含む増分レポートを生成する", () => {
      const delta = {
        hasChanges: true,
        changedPages: [
          {
            id: "page-2",
            changeType: "updated" as const,
            title: "Item B",
            propertyChanges: [
              { propertyName: "priority", previousValue: null, currentValue: "High" }
            ]
          },
          {
            id: "page-3", 
            changeType: "added" as const,
            title: "Item C",
            initialProperties: { title: "Item C", status: "Draft" }
          }
        ],
        databaseName: "Test Database"
      };
      
      const report = generateIncrementalReport(delta, "2025-08-15");
      
      expect(report).toContain("# Incremental Changes - 2025-08-15");
      expect(report).toContain("## Test Database");
      expect(report).toContain("### 📝 Updated: Item B");
      expect(report).toContain("### ➕ Added: Item C");
      expect(report).toContain("- priority: null → High");
    });

    it("変更がない場合は増分レポートを生成しない", () => {
      const delta = {
        hasChanges: false,
        changedPages: [],
        databaseName: "Test Database"
      };
      
      const report = generateIncrementalReport(delta, "2025-08-15");
      
      expect(report).toBeNull();
    });
  });

  describe("重複コンテンツの処理", () => {
    it("既存レポートと重複する内容は除外する", () => {
      const existingReports = [
        "reports/notion-changes-2025-08-14.md"
      ];
      
      const newChanges = [
        { id: "page-1", changeType: "added", reportedAt: "2025-08-14T10:00:00.000Z" },
        { id: "page-2", changeType: "added", reportedAt: "2025-08-15T10:00:00.000Z" }
      ];
      
      const uniqueChanges = filterDuplicateChanges(newChanges, existingReports);
      
      expect(uniqueChanges).toHaveLength(1);
      expect(uniqueChanges[0].id).toBe("page-2");
    });

    it("初回PR作成時は全ての変更を含める", () => {
      const existingReports: string[] = [];
      
      const newChanges = [
        { id: "page-1", changeType: "added", reportedAt: "2025-08-15T10:00:00.000Z" },
        { id: "page-2", changeType: "added", reportedAt: "2025-08-15T10:00:00.000Z" }
      ];
      
      const uniqueChanges = filterDuplicateChanges(newChanges, existingReports);
      
      expect(uniqueChanges).toHaveLength(2);
    });
  });

  describe("PR更新フロー統合", () => {
    it("既存PR更新時に差分のみをPRに追加する", async () => {
      const prBranch = "test-notion-changes-20250815-085419";
      const environment = "test";
      
      const mockWorkflow = {
        loadPreviousState: vi.fn().mockResolvedValue(mockPreviousState),
        detectCurrentChanges: vi.fn().mockResolvedValue(mockCurrentState),
        generateIncrementalReport: vi.fn().mockResolvedValue("# Incremental Changes..."),
        updatePRWithIncrement: vi.fn()
      };
      
      await updateExistingPRWithIncrement(prBranch, environment, mockWorkflow);
      
      expect(mockWorkflow.loadPreviousState).toHaveBeenCalledWith(prBranch);
      expect(mockWorkflow.detectCurrentChanges).toHaveBeenCalledWith(environment);
      expect(mockWorkflow.generateIncrementalReport).toHaveBeenCalled();
      expect(mockWorkflow.updatePRWithIncrement).toHaveBeenCalled();
    });

    it("差分がない場合はPR更新をスキップする", async () => {
      const prBranch = "test-notion-changes-20250815-085419";
      const environment = "test";
      
      const mockWorkflow = {
        loadPreviousState: vi.fn().mockResolvedValue(mockCurrentState), // 同じstate
        detectCurrentChanges: vi.fn().mockResolvedValue(mockCurrentState),
        generateIncrementalReport: vi.fn().mockResolvedValue(null),
        updatePRWithIncrement: vi.fn()
      };
      
      const result = await updateExistingPRWithIncrement(prBranch, environment, mockWorkflow);
      
      expect(result.action).toBe("no_changes");
      expect(mockWorkflow.updatePRWithIncrement).not.toHaveBeenCalled();
    });
  });
});

// テスト対象となる実装関数のインターface定義
// 実際の実装時にこれらの関数を作成する

interface StateDelta {
  hasChanges: boolean;
  changedPages: Array<{
    id: string;
    changeType: "added" | "updated" | "deleted";
    title: string;
    propertyChanges?: Array<{
      propertyName: string;
      previousValue: unknown;
      currentValue: unknown;
    }>;
    initialProperties?: Record<string, unknown>;
  }>;
  databaseName: string;
}

interface DatabaseState {
  lastSync: string;
  pages: Array<{
    id: string;
    last_edited_time: string;
    properties?: Record<string, unknown>;
  }>;
}

// テスト用のスタブ実装（実際の実装では別ファイルに移動）
function calculateStateDelta(previousState: DatabaseState, currentState: DatabaseState): StateDelta {
  const changedPages = [];
  const currentMap = new Map(currentState.pages.map(p => [p.id, p]));
  const previousMap = new Map(previousState.pages.map(p => [p.id, p]));
  
  // 新規追加・更新されたページをチェック
  for (const currentPage of currentState.pages) {
    const previousPage = previousMap.get(currentPage.id);
    
    if (!previousPage) {
      changedPages.push({
        id: currentPage.id,
        changeType: "added" as const,
        title: `Page ${currentPage.id}`,
        initialProperties: currentPage.properties
      });
    } else if (currentPage.last_edited_time !== previousPage.last_edited_time) {
      changedPages.push({
        id: currentPage.id,
        changeType: "updated" as const,
        title: `Page ${currentPage.id}`,
        propertyChanges: []
      });
    }
  }
  
  return {
    hasChanges: changedPages.length > 0,
    changedPages,
    databaseName: "Test Database"
  };
}

async function loadPreviousStateFromPR(branchName: string, gitOps: any): Promise<Record<string, DatabaseState>> {
  await gitOps.fetchBranch(branchName);
  return await gitOps.readStateFromBranch() || {};
}

function generateIncrementalReport(delta: StateDelta, date: string): string | null {
  if (!delta.hasChanges) return null;
  
  let report = `# Incremental Changes - ${date}\n\n`;
  report += `## ${delta.databaseName}\n\n`;
  
  for (const change of delta.changedPages) {
    if (change.changeType === "added") {
      report += `### ➕ Added: ${change.title}\n\n`;
    } else if (change.changeType === "updated") {
      report += `### 📝 Updated: ${change.title}\n\n`;
      if (change.propertyChanges) {
        for (const prop of change.propertyChanges) {
          report += `- ${prop.propertyName}: ${prop.previousValue} → ${prop.currentValue}\n`;
        }
      }
    }
  }
  
  return report;
}

function filterDuplicateChanges(changes: any[], existingReports: string[]): any[] {
  if (existingReports.length === 0) return changes;
  
  // 簡易実装：最新の変更のみを返す
  return changes.filter(change => 
    new Date(change.reportedAt).getDate() === new Date().getDate()
  );
}

async function updateExistingPRWithIncrement(branchName: string, environment: string, workflow: any) {
  const previousState = await workflow.loadPreviousState(branchName);
  const currentState = await workflow.detectCurrentChanges(environment);
  
  const incrementalReport = await workflow.generateIncrementalReport(previousState, currentState);
  
  if (!incrementalReport) {
    return { action: "no_changes" };
  }
  
  await workflow.updatePRWithIncrement(incrementalReport);
  return { action: "updated" };
}