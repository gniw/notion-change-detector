export interface PropertyChange {
  propertyName: string;
  previousValue: unknown;
  currentValue: unknown;
}

export interface PageChange {
  id: string;
  title: string;
  changeType: "added" | "updated" | "deleted";
  last_edited_time: string;
  previous_time?: string;
  propertyChanges?: PropertyChange[];
}

export interface DatabaseChanges {
  databaseId: string;
  databaseName: string;
  changes: PageChange[];
  summary: {
    added: number;
    updated: number;
    deleted: number;
  };
}

interface SimplePage {
  id: string;
  last_edited_time: string;
  properties?: Record<string, unknown>;
}

export class NotionDiffer {
  detectPageChanges(
    previousPages: SimplePage[],
    currentPages: SimplePage[],
    databaseId: string,
    databaseName: string,
  ): DatabaseChanges {
    const changes: PageChange[] = [];

    const previousMap = new Map(previousPages.map((page) => [page.id, page]));
    const currentMap = new Map(currentPages.map((page) => [page.id, page]));

    for (const currentPage of currentPages) {
      const previousPage = previousMap.get(currentPage.id);

      if (!previousPage) {
        changes.push({
          id: currentPage.id,
          title: this.extractPageTitle(currentPage),
          changeType: "added",
          last_edited_time: currentPage.last_edited_time,
        });
      } else if (this.hasPageChanged(previousPage, currentPage)) {
        const propertyChanges = this.getPropertyChanges(previousPage, currentPage);
        changes.push({
          id: currentPage.id,
          title: this.extractPageTitle(currentPage),
          changeType: "updated",
          last_edited_time: currentPage.last_edited_time,
          previous_time: previousPage.last_edited_time,
          propertyChanges,
        });
      }
    }

    for (const previousPage of previousPages) {
      if (!currentMap.has(previousPage.id)) {
        changes.push({
          id: previousPage.id,
          title: this.extractPageTitle(previousPage),
          changeType: "deleted",
          last_edited_time: previousPage.last_edited_time,
        });
      }
    }

    const summary = {
      added: changes.filter((c) => c.changeType === "added").length,
      updated: changes.filter((c) => c.changeType === "updated").length,
      deleted: changes.filter((c) => c.changeType === "deleted").length,
    };

    return {
      databaseId,
      databaseName,
      changes,
      summary,
    };
  }

  private hasPageChanged(previousPage: SimplePage, currentPage: SimplePage): boolean {
    // last_edited_timeの変更をチェック
    if (currentPage.last_edited_time !== previousPage.last_edited_time) {
      return true;
    }

    // プロパティの変更をチェック
    return this.hasPropertiesChanged(previousPage.properties, currentPage.properties);
  }

  private hasPropertiesChanged(previousProps: Record<string, unknown> | undefined, currentProps: Record<string, unknown> | undefined): boolean {
    // 両方ともプロパティがない場合は変更なし
    if (!previousProps && !currentProps) {
      return false;
    }

    // 一方だけにプロパティがある場合は変更あり
    if (!previousProps || !currentProps) {
      return true;
    }

    // プロパティの浅い比較
    const prevKeys = Object.keys(previousProps);
    const currKeys = Object.keys(currentProps);

    // プロパティ数が違う場合は変更あり
    if (prevKeys.length !== currKeys.length) {
      return true;
    }

    // 各プロパティの値を比較
    for (const key of prevKeys) {
      if (!(key in currentProps)) {
        return true;
      }

      // プロパティの値をJSON文字列で比較（簡易的な比較）
      try {
        const prevValue = JSON.stringify(previousProps[key]);
        const currValue = JSON.stringify(currentProps[key]);
        if (prevValue !== currValue) {
          return true;
        }
      } catch {
        // JSON化できない場合は参照比較
        if (previousProps[key] !== currentProps[key]) {
          return true;
        }
      }
    }

    return false;
  }

  extractPageTitle(page: SimplePage): string {
    if (!page.properties) {
      return page.id;
    }

    // PropertyExtractorで変換された形式では、文字列として格納される
    if (typeof page.properties.Name === 'string' && page.properties.Name.trim()) {
      return page.properties.Name;
    }

    if (typeof page.properties.Title === 'string' && page.properties.Title.trim()) {
      return page.properties.Title;
    }

    return page.id;
  }

  hasChanges(changes: DatabaseChanges): boolean {
    return changes.changes.length > 0;
  }

  getTotalChangeCount(changes: DatabaseChanges): number {
    return changes.summary.added + changes.summary.updated + changes.summary.deleted;
  }

  private getPropertyChanges(previousPage: SimplePage, currentPage: SimplePage): PropertyChange[] {
    const propertyChanges: PropertyChange[] = [];

    // プロパティがない場合は空配列を返す
    if (!previousPage.properties && !currentPage.properties) {
      return propertyChanges;
    }

    // すべてのプロパティキーを取得（前回と今回の両方）
    const allPropertyKeys = new Set([
      ...Object.keys(previousPage.properties || {}),
      ...Object.keys(currentPage.properties || {}),
    ]);

    for (const propertyName of allPropertyKeys) {
      const previousValue = previousPage.properties?.[propertyName];
      const currentValue = currentPage.properties?.[propertyName];

      // プロパティが変更されているかチェック
      if (!this.areValuesEqual(previousValue, currentValue)) {
        propertyChanges.push({
          propertyName,
          previousValue,
          currentValue,
        });
      }
    }

    return propertyChanges;
  }

  private areValuesEqual(value1: unknown, value2: unknown): boolean {
    // 両方ともundefinedまたはnullの場合は等しい
    if ((value1 == null) && (value2 == null)) {
      return true;
    }

    // 一方がundefined/nullの場合は異なる
    if ((value1 == null) !== (value2 == null)) {
      return false;
    }

    // JSON文字列で比較（配列やオブジェクトにも対応）
    try {
      return JSON.stringify(value1) === JSON.stringify(value2);
    } catch {
      // JSON化できない場合は参照比較
      return value1 === value2;
    }
  }
}
