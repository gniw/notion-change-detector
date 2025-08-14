export class PropertyExtractor {
  /**
   * Notionページのpropertiesを簡略化されたキー・バリュー形式に変換
   */
  extractProperties(notionPage: any): Record<string, any> {
    if (!notionPage.properties) {
      return {};
    }

    const simplifiedProperties: Record<string, any> = {};

    for (const [key, property] of Object.entries(notionPage.properties)) {
      const prop = property as any;
      simplifiedProperties[key] = this.extractPropertyValue(prop);
    }

    return simplifiedProperties;
  }

  private extractPropertyValue(property: any): any {
    if (!property?.type) {
      return null;
    }

    switch (property.type) {
      case "title":
        return this.extractTitleValue(property.title);
      
      case "rich_text":
        return this.extractRichTextValue(property.rich_text);
      
      case "select":
        return property.select?.name || null;
      
      case "status":
        return property.status?.name || null;
      
      case "relation":
        return property.relation?.map((rel: any) => rel.id) || [];
      
      case "rollup":
        return this.extractRollupValue(property.rollup);
      
      case "number":
        return property.number;
      
      case "checkbox":
        return property.checkbox;
      
      case "date":
        return property.date?.start || null;
      
      case "url":
        return property.url;
      
      case "email":
        return property.email;
      
      case "phone_number":
        return property.phone_number;
      
      case "multi_select":
        return property.multi_select?.map((item: any) => item.name) || [];
      
      case "people":
        return property.people?.map((person: any) => person.id) || [];
      
      case "files":
        return this.extractFilesValue(property.files);
      
      case "formula":
        return this.extractFormulaValue(property.formula);
      
      case "created_time":
        return property.created_time;
      
      case "created_by":
        return property.created_by?.id;
      
      case "last_edited_time":
        return property.last_edited_time;
      
      case "last_edited_by":
        return property.last_edited_by?.id;
      
      default:
        // 未知のプロパティタイプの場合はnullを返す
        return null;
    }
  }

  private extractTitleValue(titleArray: any[]): string {
    if (!titleArray || titleArray.length === 0) {
      return "";
    }
    
    return titleArray
      .map(item => item.plain_text || "")
      .join("")
      .trim();
  }

  private extractRichTextValue(richTextArray: any[]): string {
    if (!richTextArray || richTextArray.length === 0) {
      return "";
    }
    
    return richTextArray
      .map(item => item.plain_text || "")
      .join("")
      .trim();
  }

  private extractRollupValue(rollup: any): any {
    if (!rollup) {
      return null;
    }

    switch (rollup.type) {
      case "array":
        if (!rollup.array || rollup.array.length === 0) {
          return [];
        }
        // 配列の各要素から値を抽出
        return rollup.array.map((item: any) => {
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

  private extractFormulaValue(formula: any): any {
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

  private extractFilesValue(filesArray: any[]): string[] {
    if (!filesArray || filesArray.length === 0) {
      return [];
    }

    return filesArray.map(file => {
      // ファイル名が優先、なければURL
      return file.name || file.file?.url || file.external?.url || "";
    }).filter(Boolean);
  }
}