import { describe, expect, it } from "vitest";
import { generateNotionChangeReport } from "../scripts/notion/index";

describe("index module", () => {
  it("should export generateNotionChangeReport function", () => {
    expect(typeof generateNotionChangeReport).toBe("function");
  });
});
