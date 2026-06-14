import { describe, expect, it } from "vitest";
import { isValidGuid, parseProperties, truncateMiddle } from "../src/helpers.js";

describe("isValidGuid", () => {
  it("accepts a valid GUID", () => {
    expect(isValidGuid("8578e004-a5c6-46e7-913e-12f58912df43")).toBe(true);
  });

  it("rejects an invalid GUID", () => {
    expect(isValidGuid("not-a-guid")).toBe(false);
  });
});

describe("parseProperties", () => {
  it("returns an object unchanged", () => {
    expect(parseProperties({ displayName: "App" })).toEqual({ displayName: "App" });
  });

  it("parses JSON strings", () => {
    expect(parseProperties('{"displayName":"App"}')).toEqual({ displayName: "App" });
  });

  it("returns an empty object for invalid JSON", () => {
    expect(parseProperties("{" )).toEqual({});
  });
});

describe("truncateMiddle", () => {
  it("shortens long values", () => {
    expect(truncateMiddle("12345678901234567890", 5, 4)).toBe("12345…7890");
  });
});
