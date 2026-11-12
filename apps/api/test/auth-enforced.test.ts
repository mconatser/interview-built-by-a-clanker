import { describe, it, expect, beforeAll } from "vitest";
import type { buildTestApp } from "./helpers.js";

// B1: protected routes must verify the JWT with no env flag set.
const protectedRoutes = [
  { method: "GET", url: "/auth/me" },
  { method: "GET", url: "/cart" },
  { method: "GET", url: "/favorites" },
  { method: "POST", url: "/checkout", payload: { name: "A", email: "a@example.com" } },
] as const;

describe("B1: authentication is enforced by default", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let auth: { authorization: string };

  beforeAll(async () => {
    // Regression guard: the old middleware read ENFORCE_AUTH at import time, so clear it
    // before importing the routes. The test then proves auth is on with no env set.
    delete process.env.ENFORCE_AUTH;
    const { buildTestApp, registerUser } = await import("./helpers.js");
    app = await buildTestApp();
    ({ auth } = await registerUser(app));
  });

  it("serves a logged-in user with a valid token", async () => {
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: auth });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ username: expect.any(String) });

    const cart = await app.inject({ method: "GET", url: "/cart", headers: auth });
    expect(cart.statusCode).toBe(200);
    expect(cart.json()).toEqual({ items: [], total: 0 });
  });

  for (const route of protectedRoutes) {
    it(`${route.method} ${route.url} rejects a missing token with 401`, async () => {
      const res = await app.inject({ ...route });
      expect(res.statusCode).toBe(401);
    });

    it(`${route.method} ${route.url} rejects a forged token with 401`, async () => {
      const res = await app.inject({ ...route, headers: { authorization: "Bearer not-a-jwt" } });
      expect(res.statusCode).toBe(401);
    });
  }
});
