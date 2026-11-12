import { describe, it, expect } from "vitest";
import { buildTestApp, registerUser } from "./helpers.js";
import { db } from "../src/db.js";

// B5: placing an order empties the cart, so the same cart can't be ordered twice.
const checkoutBody = { name: "Alice", email: "alice@example.com" };

async function setup() {
  const app = await buildTestApp();
  const user = await registerUser(app);
  await app.inject({
    method: "POST",
    url: "/cart",
    headers: user.auth,
    payload: { personaId: "p-001", quantity: 2 },
  });
  return { app, user };
}

describe("B5: checkout empties the cart", () => {
  it("returns the order and leaves the cart empty", async () => {
    const { app, user } = await setup();

    const res = await app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ total: 99.98, items: [{ personaId: "p-001", quantity: 2 }] });

    const cart = await app.inject({ method: "GET", url: "/cart", headers: user.auth });
    expect(cart.json()).toEqual({ items: [], total: 0 });
  });

  it("a second checkout of the same cart is rejected and creates no order", async () => {
    const { app, user } = await setup();

    await app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody });
    const again = await app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody });

    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual({ error: "Cart is empty" });
    expect(db.orders.getByUserId(user.userId)).toHaveLength(1);
  });

  it("a double submit (two concurrent requests) creates exactly one order", async () => {
    const { app, user } = await setup();

    const results = await Promise.all([
      app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody }),
      app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody }),
    ]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 400]);
    expect(db.orders.getByUserId(user.userId)).toHaveLength(1);
  });

  it("does not touch another user's cart", async () => {
    const { app, user } = await setup();
    const bob = await registerUser(app);
    await app.inject({ method: "POST", url: "/cart", headers: bob.auth, payload: { personaId: "p-002", quantity: 1 } });

    await app.inject({ method: "POST", url: "/checkout", headers: user.auth, payload: checkoutBody });

    const bobCart = await app.inject({ method: "GET", url: "/cart", headers: bob.auth });
    expect(bobCart.json().items).toMatchObject([{ personaId: "p-002", quantity: 1 }]);
  });
});
