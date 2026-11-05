import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { isPublicPath } from "./publicRoutes";

describe("public page navigation", () => {
  test("redeem uses the public header instead of the signed-in shell", () => {
    assert.equal(isPublicPath("/redeem"), true);
  });
  test("student workspace retains signed-in navigation", () => {
    assert.equal(isPublicPath("/app"), false);
  });
});