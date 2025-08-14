import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

// Notion プロパティのユニオン型を取得
type NotionProperty = PageObjectResponse['properties'][string];

// 条件型を使用して特定のプロパティタイプを抽出するヘルパー
type ExtractProperty<T extends NotionProperty['type']> = Extract<NotionProperty, { type: T }>;

export class PropertyExtractor {
  /**
   * Notionページのpropertiesを簡略化されたキー・バリュー形式に変換
   */
  extractProperties(notionPage: Pick<PageObjectResponse, 'properties'>): Record<string, unknown> {
    if (!notionPage.properties) {
      return {};
    }

    const simplifiedProperties: Record<string, unknown> = {};

    for (const [key, property] of Object.entries(notionPage.properties)) {
      simplifiedProperties[key] = this.extractPropertyValue(property);
    }

    return simplifiedProperties;
  }

  private extractPropertyValue(property: NotionProperty): unknown {
    if (!property?.type) {
      return null;
    }

    switch (property.type) {
      case "title":
        return this.extractTitleValue((property as ExtractProperty<'title'>).title);
      
      case "rich_text":
        return this.extractRichTextValue((property as ExtractProperty<'rich_text'>).rich_text);
      
      case "select":
        return (property as ExtractProperty<'select'>).select?.name || null;
      
      case "status":
        return (property as ExtractProperty<'status'>).status?.name || null;
      
      case "relation":
        return (property as ExtractProperty<'relation'>).relation.map(rel => rel.id);
      
      case "rollup":
        return this.extractRollupValue((property as ExtractProperty<'rollup'>).rollup);
      
      case "number":
        return (property as ExtractProperty<'number'>).number;
      
      case "checkbox":
        return (property as ExtractProperty<'checkbox'>).checkbox;
      
      case "date":
        return (property as ExtractProperty<'date'>).date?.start || null;
      
      case "url":
        return (property as ExtractProperty<'url'>).url;
      
      case "email":
        return (property as ExtractProperty<'email'>).email;
      
      case "phone_number":
        return (property as ExtractProperty<'phone_number'>).phone_number;
      
      case "multi_select":
        return (property as ExtractProperty<'multi_select'>).multi_select.map(item => item.name);
      
      case "people":
        return (property as ExtractProperty<'people'>).people.map(person => person.id);
      
      case "files":
        return this.extractFilesValue((property as ExtractProperty<'files'>).files);
      
      case "formula":
        return this.extractFormulaValue((property as ExtractProperty<'formula'>).formula);
      
      case "created_time":
        return (property as ExtractProperty<'created_time'>).created_time;
      
      case "created_by":
        return (property as ExtractProperty<'created_by'>).created_by.id;
      
      case "last_edited_time":
        return (property as ExtractProperty<'last_edited_time'>).last_edited_time;
      
      case "last_edited_by":
        return (property as ExtractProperty<'last_edited_by'>).last_edited_by.id;
      
      default:
        // 未知のプロパティタイプの場合はnullを返す
        return null;
    }
  }

  private extractTitleValue(titleArray: ExtractProperty<'title'>['title']): string {
    if (!titleArray || titleArray.length === 0) {
      return "";
    }
    
    return titleArray
      .map(item => item.plain_text || "")
      .join("")
      .trim();
  }

  private extractRichTextValue(richTextArray: ExtractProperty<'rich_text'>['rich_text']): string {
    if (!richTextArray || richTextArray.length === 0) {
      return "";
    }
    
    return richTextArray
      .map(item => item.plain_text || "")
      .join("")
      .trim();
  }

  private extractRollupValue(rollup: ExtractProperty<'rollup'>['rollup']): unknown {
    if (!rollup) {
      return null;
    }

    switch (rollup.type) {
      case "array":
        if (!rollup.array || rollup.array.length === 0) {
          return [];
        }
        // 配列の各要素から値を抽出
        return rollup.array.map(item => {
          if (item.type === "title") {
            return this.extractTitleValue(item.title);
          } else if (item.type === "rich_text") {
            return this.extractRichTextValue(item.rich_text);
          } else if (item.type === "select") {
            return item.select?.name || null;
          } else {
            return item.plain_text || item.name || item.id || null;
          }
        }).filter(Boolean);
      
      case "number":
        return rollup.number;
      
      case "date":
        return rollup.date?.start || null;
      
      default:
        return null;
    }
  }

  private extractFormulaValue(formula: ExtractProperty<'formula'>['formula']): unknown {
    if (!formula) {
      return null;
    }

    switch (formula.type) {
      case "string":
        return formula.string;
      case "number":
        return formula.number;
      case "boolean":
        return formula.boolean;
      case "date":
        return formula.date?.start || null;
      default:
        return null;
    }
  }

  private extractFilesValue(filesArray: ExtractProperty<'files'>['files']): string[] {
    if (!filesArray || filesArray.length === 0) {
      return [];
    }

    return filesArray.map(file => {
      // ファイル名が優先、なければURL
      return file.name || file.file?.url || file.external?.url || "";
    }).filter(Boolean);
  }
}