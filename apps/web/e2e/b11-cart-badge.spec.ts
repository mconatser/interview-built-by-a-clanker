import { test, expect } from "@playwright/test";
import { signUp } from "./helpers";

// B11: the header cart badge follows the cart when it changes in the app.
test("B11: cart badge updates after adding and removing an item", async ({ page }) => {
  await signUp(page, "ivan");
  const cartLink = page.locator('nav a[href="/cart"]');
  await expect(cartLink).toHaveText(""); // empty cart: no badge

  await page.goto("/personas/p-001");
  await expect(cartLink).toHaveText("");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("button", { name: "Add to Cart" })).toBeEnabled();

  await expect(cartLink).toHaveText("1");

  await cartLink.click();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

  await expect(cartLink).toHaveText("");
});
