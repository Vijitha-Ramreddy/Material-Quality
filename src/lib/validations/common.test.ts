import { describe, expect, it } from "vitest";
import { paginationSchema } from "./common";

describe("pagination validation", () => {
  it("coerces valid pagination values and applies defaults", () => {
    expect(paginationSchema.parse({ page: "2", pageSize: "50" })).toEqual({
      page: 2,
      pageSize: 50,
    });
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("rejects zero, negative, fractional and oversized pagination values", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    expect(() => paginationSchema.parse({ pageSize: 101 })).toThrow();
    expect(() => paginationSchema.parse({ page: 1.5 })).toThrow();
  });
});
