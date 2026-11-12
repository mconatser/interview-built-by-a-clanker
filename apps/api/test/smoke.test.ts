import { describe, it, expect } from "vitest";
import { buildTestApp } from "./helpers.js";

describe("smoke", () => {
  it("lists the seeded personas", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/personas" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(15);
  });
});
