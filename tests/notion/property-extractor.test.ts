import { describe, expect, it, beforeEach } from "vitest";
import { PropertyExtractor } from "../../src/notion/property-extractor";

describe("PropertyExtractor", () => {
  let extractor: PropertyExtractor;

  beforeEach(() => {
    extractor = new PropertyExtractor();
  });

  describe("extractProperties", () => {
    it("空のプロパティオブジェクトに対して空オブジェクトを返す", () => {
      const notionPage = { properties: {} };
      const result = extractor.extractProperties(notionPage);
      expect(result).toEqual({});
    });

    it("propertiesが存在しない場合に空オブジェクトを返す", () => {
      const notionPage = { id: "test" };
      const result = extractor.extractProperties(notionPage);
      expect(result).toEqual({});
    });
  });

  describe("title プロパティ", () => {
    it("title プロパティから plain_text を抽出する", () => {
      const notionPage = {
        properties: {
          Name: {
            id: "title",
            type: "title",
            title: [
              {
                type: "text",
                text: { content: "Test Page Title", link: null },
                annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
                plain_text: "Test Page Title",
                href: null
              }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Name).toBe("Test Page Title");
    });

    it("複数のテキスト要素があるtitleを結合する", () => {
      const notionPage = {
        properties: {
          Name: {
            id: "title",
            type: "title",
            title: [
              { plain_text: "Part1" },
              { plain_text: " Part2" }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Name).toBe("Part1 Part2");
    });

    it("空のtitleに対して空文字列を返す", () => {
      const notionPage = {
        properties: {
          Name: {
            id: "title",
            type: "title",
            title: []
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Name).toBe("");
    });
  });

  describe("rich_text プロパティ", () => {
    it("rich_text プロパティから plain_text を抽出する", () => {
      const notionPage = {
        properties: {
          Description: {
            id: "desc",
            type: "rich_text",
            rich_text: [
              {
                type: "text",
                text: { content: "テスト用のプロパティ", link: null },
                annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" },
                plain_text: "テスト用のプロパティ",
                href: null
              }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Description).toBe("テスト用のプロパティ");
    });

    it("空のrich_textに対して空文字列を返す", () => {
      const notionPage = {
        properties: {
          Description: {
            id: "desc",
            type: "rich_text",
            rich_text: []
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Description).toBe("");
    });
  });

  describe("select プロパティ", () => {
    it("select プロパティからname値を抽出する", () => {
      const notionPage = {
        properties: {
          Type: {
            id: "type",
            type: "select",
            select: {
              id: "GNeM",
              name: "liquid_object",
              color: "brown"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Type).toBe("liquid_object");
    });

    it("select値がnullの場合にnullを返す", () => {
      const notionPage = {
        properties: {
          Type: {
            id: "type",
            type: "select",
            select: null
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Type).toBeNull();
    });
  });

  describe("status プロパティ", () => {
    it("status プロパティからname値を抽出する", () => {
      const notionPage = {
        properties: {
          CheckStatus: {
            id: "status",
            type: "status",
            status: {
              id: "642d9f47-784f-40c4-b9d6-85280babe515",
              name: "未確認",
              color: "default"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.CheckStatus).toBe("未確認");
    });
  });

  describe("relation プロパティ", () => {
    it("relation プロパティからID配列を抽出する", () => {
      const notionPage = {
        properties: {
          Object: {
            id: "rel",
            type: "relation",
            relation: [
              { id: "1d1a2a12-137b-81d8-8a8b-e4238e7556c0" }
            ],
            has_more: false
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Object).toEqual(["1d1a2a12-137b-81d8-8a8b-e4238e7556c0"]);
    });

    it("空のrelationに対して空配列を返す", () => {
      const notionPage = {
        properties: {
          Object: {
            id: "rel",
            type: "relation",
            relation: [],
            has_more: false
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Object).toEqual([]);
    });
  });

  describe("rollup プロパティ", () => {
    it("rollup array から title値を抽出する", () => {
      const notionPage = {
        properties: {
          Object_Name: {
            id: "rollup",
            type: "rollup",
            rollup: {
              type: "array",
              array: [
                {
                  type: "title",
                  title: [
                    { plain_text: "Admin" }
                  ]
                }
              ],
              function: "show_original"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Object_Name).toEqual(["Admin"]);
    });

    it("rollup number値を抽出する", () => {
      const notionPage = {
        properties: {
          Count: {
            id: "rollup",
            type: "rollup",
            rollup: {
              type: "number",
              number: 42,
              function: "count"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Count).toBe(42);
    });

    it("空のrollup arrayに対して空配列を返す", () => {
      const notionPage = {
        properties: {
          Empty_Rollup: {
            id: "rollup",
            type: "rollup",
            rollup: {
              type: "array",
              array: [],
              function: "show_original"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Empty_Rollup).toEqual([]);
    });
  });

  describe("その他のプロパティタイプ", () => {
    it("number プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          Score: {
            id: "num",
            type: "number",
            number: 123.45
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Score).toBe(123.45);
    });

    it("checkbox プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          IsActive: {
            id: "check",
            type: "checkbox",
            checkbox: true
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.IsActive).toBe(true);
    });

    it("url プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          Website: {
            id: "url",
            type: "url",
            url: "https://example.com"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Website).toBe("https://example.com");
    });

    it("email プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          Contact: {
            id: "email",
            type: "email",
            email: "test@example.com"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Contact).toBe("test@example.com");
    });

    it("phone_number プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          Phone: {
            id: "phone",
            type: "phone_number",
            phone_number: "+81-90-1234-5678"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Phone).toBe("+81-90-1234-5678");
    });

    it("date プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          StartDate: {
            id: "date",
            type: "date",
            date: {
              start: "2025-01-15",
              end: null,
              time_zone: null
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.StartDate).toBe("2025-01-15");
    });

    it("multi_select プロパティから名前の配列を抽出する", () => {
      const notionPage = {
        properties: {
          Tags: {
            id: "multi",
            type: "multi_select",
            multi_select: [
              { id: "1", name: "tag1", color: "blue" },
              { id: "2", name: "tag2", color: "green" }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Tags).toEqual(["tag1", "tag2"]);
    });

    it("people プロパティからIDの配列を抽出する", () => {
      const notionPage = {
        properties: {
          Assignee: {
            id: "people",
            type: "people",
            people: [
              { id: "user1", object: "user" },
              { id: "user2", object: "user" }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Assignee).toEqual(["user1", "user2"]);
    });

    it("created_time プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          Created: {
            id: "created",
            type: "created_time",
            created_time: "2025-01-15T10:30:00.000Z"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Created).toBe("2025-01-15T10:30:00.000Z");
    });

    it("last_edited_time プロパティを正しく抽出する", () => {
      const notionPage = {
        properties: {
          LastEdited: {
            id: "edited",
            type: "last_edited_time",
            last_edited_time: "2025-01-16T10:30:00.000Z"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.LastEdited).toBe("2025-01-16T10:30:00.000Z");
    });

    it("created_by プロパティからIDを抽出する", () => {
      const notionPage = {
        properties: {
          Creator: {
            id: "created_by",
            type: "created_by",
            created_by: {
              id: "user123",
              object: "user"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Creator).toBe("user123");
    });

    it("last_edited_by プロパティからIDを抽出する", () => {
      const notionPage = {
        properties: {
          Editor: {
            id: "edited_by",
            type: "last_edited_by",
            last_edited_by: {
              id: "user456",
              object: "user"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Editor).toBe("user456");
    });
  });

  describe("formula プロパティ", () => {
    it("string formula値を正しく抽出する", () => {
      const notionPage = {
        properties: {
          FormattedName: {
            id: "formula",
            type: "formula",
            formula: {
              type: "string",
              string: "Formatted Value"
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.FormattedName).toBe("Formatted Value");
    });

    it("number formula値を正しく抽出する", () => {
      const notionPage = {
        properties: {
          CalculatedValue: {
            id: "formula",
            type: "formula",
            formula: {
              type: "number",
              number: 98.5
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.CalculatedValue).toBe(98.5);
    });

    it("boolean formula値を正しく抽出する", () => {
      const notionPage = {
        properties: {
          IsValid: {
            id: "formula",
            type: "formula",
            formula: {
              type: "boolean",
              boolean: true
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.IsValid).toBe(true);
    });

    it("date formula値を正しく抽出する", () => {
      const notionPage = {
        properties: {
          CalculatedDate: {
            id: "formula",
            type: "formula",
            formula: {
              type: "date",
              date: {
                start: "2025-01-20",
                end: null,
                time_zone: null
              }
            }
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.CalculatedDate).toBe("2025-01-20");
    });
  });

  describe("files プロパティ", () => {
    it("files プロパティからファイル名/URLを抽出する", () => {
      const notionPage = {
        properties: {
          Attachments: {
            id: "files",
            type: "files",
            files: [
              {
                name: "document.pdf",
                type: "file",
                file: { url: "https://example.com/doc.pdf", expiry_time: "2025-01-20T10:30:00.000Z" }
              },
              {
                name: "image.png",
                type: "external",
                external: { url: "https://external.com/image.png" }
              }
            ]
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Attachments).toEqual(["document.pdf", "image.png"]);
    });

    it("空のfilesに対して空配列を返す", () => {
      const notionPage = {
        properties: {
          Attachments: {
            id: "files",
            type: "files",
            files: []
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.Attachments).toEqual([]);
    });
  });

  describe("未知のプロパティタイプ", () => {
    it("未知のタイプに対してnullを返す", () => {
      const notionPage = {
        properties: {
          UnknownProp: {
            id: "unknown",
            type: "unknown_type",
            unknown_data: "some value"
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result.UnknownProp).toBeNull();
    });
  });

  describe("複数のプロパティタイプの組み合わせ", () => {
    it("複数のプロパティタイプを同時に処理する", () => {
      const notionPage = {
        properties: {
          Name: {
            type: "title",
            title: [{ plain_text: "Test Page" }]
          },
          Type: {
            type: "select",
            select: { name: "Task" }
          },
          IsComplete: {
            type: "checkbox",
            checkbox: false
          },
          Score: {
            type: "number",
            number: 85
          }
        }
      };

      const result = extractor.extractProperties(notionPage);
      expect(result).toEqual({
        Name: "Test Page",
        Type: "Task",
        IsComplete: false,
        Score: 85
      });
    });
  });
});