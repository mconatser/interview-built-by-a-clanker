import { test, expect } from "@playwright/test";
import { API, signUp } from "./helpers";

// B15: the app's bodyless DELETE calls must succeed (no JSON content-type on an empty body).
test.describe("B15: delete actions in the UI", () => {
  test("removing an item empties the cart", async ({ page }) => {
    const token = await signUp(page, "carol");
    const add = await page.request.post(`${API}/cart`, {
      headers: { authorization: `Bearer ${token}` },
      data: { personaId: "p-001", quantity: 1 },
    });
    expect(add.ok()).toBeTruthy();

    await page.goto("/cart");
    await page.getByRole("button", { name: "Remove" }).click();

    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    const cart = await (await page.request.get(`${API}/cart`, { headers: { authorization: `Bearer ${token}` } })).json();
    expect(cart.items).toEqual([]);
  });

  test("removing a favorite from the favorites page", async ({ page }) => {
    const token = await signUp(page, "erin");
    const fav = await page.request.post(`${API}/favorites`, {
      headers: { authorization: `Bearer ${token}` },
      data: { personaId: "p-001" },
    });
    expect(fav.ok()).toBeTruthy();

    await page.goto("/favorites");
    await page.getByRole("button", { name: "Remove from favorites" }).click();

    await expect(page.getByText("You haven't favorited any personas yet.")).toBeVisible();
    const favs = await (await page.request.get(`${API}/favorites`, { headers: { authorization: `Bearer ${token}` } })).json();
    expect(favs.favorites).toEqual([]);
  });
});
