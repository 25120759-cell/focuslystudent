import { describe, expect, test } from "bun:test";
import { isPublicPath } from "./publicRoutes";

describe("public page navigation", () => {
  test("redeem uses the public header instead of the signed-in shell", () => {
    expect(isPublicPath("/redeem")).toBe(true);
  });
  test("student workspace retains signed-in navigation", () => {
    expect(isPublicPath("/app")).toBe(false);
  });
});