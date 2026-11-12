import { describe, it, expect, beforeAll } from "vitest";
import { buildTestApp } from "./helpers.js";
import type { Persona } from "@acme/shared";

// B9: minPrice is a lower bound, maxPrice an upper bound, and both are inclusive.
describe("B9: price filters on GET /personas", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let all: Persona[];

  const list = async (qs: string) =>
    (await app.inject({ method: "GET", url: `/personas?${qs}` })).json() as Persona[];
  const ids = (ps: Persona[]) => ps.map((p) => p.id).sort();

  beforeAll(async () => {
    app = await buildTestApp();
    all = await list("");
  });

  it("minPrice returns only personas at or above the minimum", async () => {
    const res = await list("minPrice=60");
    expect(res.length).toBeGreaterThan(0);
    expect(ids(res)).toEqual(ids(all.filter((p) => p.price >= 60)));
  });

  it("maxPrice returns only personas at or below the maximum", async () => {
    const res = await list("maxPrice=60");
    expect(res.length).toBeGreaterThan(0);
    expect(ids(res)).toEqual(ids(all.filter((p) => p.price <= 60)));
  });

  it("minPrice and maxPrice together return the range", async () => {
    const res = await list("minPrice=50&maxPrice=70");
    expect(res.length).toBeGreaterThan(0);
    expect(ids(res)).toEqual(ids(all.filter((p) => p.price >= 50 && p.price <= 70)));
  });

  it("minPrice equal to a persona's price includes it", async () => {
    const res = await list("minPrice=99.99");
    expect(res.map((p) => p.price)).toEqual([99.99]);
  });
});
