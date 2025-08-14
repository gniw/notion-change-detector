import { describe, expect, it } from "vitest";
import { generateNotionChangeReport } from "../src/index";

describe("index module", () => {
  it("should export generateNotionChangeReport function", () => {
    expect(typeof generateNotionChangeReport).toBe("function");
  });
});
