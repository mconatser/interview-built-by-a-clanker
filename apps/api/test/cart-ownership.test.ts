import { describe, it, expect, beforeAll } from "vitest";
import { buildTestApp, registerUser } from "./helpers.js";

// B2: cart items can only be changed or removed by the user who owns them.
describe("B2: cart item ownership", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let alice: Awaited<ReturnType<typeof registerUser>>;
  let bob: Awaited<ReturnType<typeof registerUser>>;
  let aliceItemId: string;

  beforeAll(async () => {
    app = await buildTestApp();
    alice = await registerUser(app);
    bob = await registerUser(app);
    const add = await app.inject({
      method: "POST",
      url: "/cart",
      headers: alice.auth,
      payload: { personaId: "p-001", quantity: 1 },
    });
    aliceItemId = add.json().items[0].id;
  });

  const aliceCart = async () =>
    (await app.inject({ method: "GET", url: "/cart", headers: alice.auth })).json();

  it("another user cannot update the item (404)", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/cart/${aliceItemId}`,
      headers: bob.auth,
      payload: { quantity: 5 },
    });
    expect(res.statusCode).toBe(404);
    expect((await aliceCart()).items).toMatchObject([{ id: aliceItemId, quantity: 1 }]);
  });

  it("another user cannot delete the item (404), and the owner's cart is unchanged", async () => {
    const res = await app.inject({ method: "DELETE", url: `/cart/${aliceItemId}`, headers: bob.auth });
    expect(res.statusCode).toBe(404);
    expect((await aliceCart()).items).toMatchObject([{ id: aliceItemId, quantity: 1 }]);
  });

  it("the owner can still delete their own item", async () => {
    const res = await app.inject({ method: "DELETE", url: `/cart/${aliceItemId}`, headers: alice.auth });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], total: 0 });
  });
});
