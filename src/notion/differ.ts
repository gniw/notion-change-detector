export interface PageChange {
  id: string;
  title: string;
  changeType: "added" | "updated" | "deleted";
  last_edited_time: string;
  previous_time?: string;
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
  properties?: any;
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
      } else if (currentPage.last_edited_time !== previousPage.last_edited_time) {
        changes.push({
          id: currentPage.id,
          title: this.extractPageTitle(currentPage),
          changeType: "updated",
          last_edited_time: currentPage.last_edited_time,
          previous_time: previousPage.last_edited_time,
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

  extractPageTitle(page: SimplePage): string {
    if (!page.properties) {
      return page.id;
    }

    const nameProperty = page.properties.Name?.title;
    if (nameProperty && nameProperty.length > 0 && nameProperty[0].plain_text) {
      return nameProperty[0].plain_text;
    }

    const titleProperty = page.properties.Title?.title;
    if (titleProperty && titleProperty.length > 0 && titleProperty[0].plain_text) {
      return titleProperty[0].plain_text;
    }

    return page.id;
  }

  hasChanges(changes: DatabaseChanges): boolean {
    return changes.changes.length > 0;
  }

  getTotalChangeCount(changes: DatabaseChanges): number {
    return changes.summary.added + changes.summary.updated + changes.summary.deleted;
  }
}
