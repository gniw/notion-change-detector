import type { DatabaseState } from "../storage/state-manager";
import { NotionDiffer } from "../notion/differ";
import type { DatabaseChanges } from "../notion/differ";

/**
 * GitHub Actions用のState比較ユーティリティ
 * 既存PRの更新時に差分のみを検出するために使用
 */

export interface StateDelta {
  hasChanges: boolean;
  databaseId: string;
  databaseName: string;
  changedPages: Array<{
    id: string;
    changeType: "added" | "updated" | "deleted";
    title: string;
    last_edited_time: string;
    previous_time?: string;
    propertyChanges?: Array<{
      propertyName: string;
      previousValue: unknown;
      currentValue: unknown;
    }>;
    initialProperties?: Record<string, unknown>;
  }>;
  summary: {
    added: number;
    updated: number;
    deleted: number;
  };
}

export interface MultiDatabaseStateDelta {
  hasChanges: boolean;
  deltas: StateDelta[];
  totalChanges: {
    added: number;
    updated: number;
    deleted: number;
  };
}

export class StateComparison {
  private differ: NotionDiffer;

  constructor() {
    this.differ = new NotionDiffer();
  }

  /**
   * 単一データベースの前回stateと現在stateを比較して差分を計算
   */
  calculateSingleDatabaseDelta(
    databaseId: string,
    databaseName: string,
    previousState: DatabaseState | null,
    currentState: DatabaseState
  ): StateDelta {
    // previousStateがnullの場合（初回実行）は全て新規として扱う
    const prevPages = previousState?.pages || [];
    const currentPages = currentState.pages;

    const changes = this.differ.comparePages(prevPages, currentPages, databaseId, databaseName);

    return {
      hasChanges: changes.changes.length > 0,
      databaseId,
      databaseName,
      changedPages: changes.changes.map(change => ({
        id: change.id,
        changeType: change.changeType,
        title: change.title,
        last_edited_time: change.last_edited_time,
        previous_time: change.previous_time,
        propertyChanges: change.propertyChanges,
        initialProperties: change.initialProperties
      })),
      summary: changes.summary
    };
  }

  /**
   * 複数データベースの差分を一括計算
   */
  calculateMultiDatabaseDelta(
    previousStates: Record<string, DatabaseState>,
    currentStates: Record<string, DatabaseState>,
    databaseNames: Record<string, string>
  ): MultiDatabaseStateDelta {
    const deltas: StateDelta[] = [];
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;

    for (const [databaseId, currentState] of Object.entries(currentStates)) {
      const previousState = previousStates[databaseId] || null;
      const databaseName = databaseNames[databaseId] || `Database ${databaseId}`;

      const delta = this.calculateSingleDatabaseDelta(
        databaseId,
        databaseName,
        previousState,
        currentState
      );

      if (delta.hasChanges) {
        deltas.push(delta);
        totalAdded += delta.summary.added;
        totalUpdated += delta.summary.updated;
        totalDeleted += delta.summary.deleted;
      }
    }

    return {
      hasChanges: deltas.length > 0,
      deltas,
      totalChanges: {
        added: totalAdded,
        updated: totalUpdated,
        deleted: totalDeleted
      }
    };
  }

  /**
   * 差分がtime-based filtering（指定日時以降の変更のみ）でフィルタリング
   */
  filterDeltaByTime(delta: StateDelta, cutoffTime: string): StateDelta {
    const cutoffDate = new Date(cutoffTime);
    
    const filteredPages = delta.changedPages.filter(page => {
      const pageTime = new Date(page.last_edited_time);
      return pageTime > cutoffDate;
    });

    const summary = {
      added: filteredPages.filter(p => p.changeType === "added").length,
      updated: filteredPages.filter(p => p.changeType === "updated").length,
      deleted: filteredPages.filter(p => p.changeType === "deleted").length
    };

    return {
      ...delta,
      hasChanges: filteredPages.length > 0,
      changedPages: filteredPages,
      summary
    };
  }

  /**
   * デバッグ用：差分の概要を文字列で取得
   */
  getDeltaSummary(delta: MultiDatabaseStateDelta): string {
    if (!delta.hasChanges) {
      return "No changes detected";
    }

    const lines = [
      `Total changes: ${delta.totalChanges.added + delta.totalChanges.updated + delta.totalChanges.deleted}`,
      `  Added: ${delta.totalChanges.added}`,
      `  Updated: ${delta.totalChanges.updated}`,
      `  Deleted: ${delta.totalChanges.deleted}`,
      "",
      "Database breakdown:"
    ];

    for (const dbDelta of delta.deltas) {
      lines.push(
        `  ${dbDelta.databaseName}: ${dbDelta.summary.added + dbDelta.summary.updated + dbDelta.summary.deleted} changes`
      );
    }

    return lines.join("\n");
  }
}