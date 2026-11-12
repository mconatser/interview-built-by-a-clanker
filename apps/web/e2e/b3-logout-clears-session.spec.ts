import { test, expect, type Page } from "@playwright/test";

const API = "http://localhost:3001";

async function signUp(page: Page, name: string) {
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  // Navigate in-app (no page load) once the app is open, so the in-memory query cache survives like it does for a real user.
  if (page.url() === "about:blank") await page.goto("/");
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
}

test.describe("B3: signing out ends the session", () => {
  test("stays signed out after a reload", async ({ page }) => {
    await signUp(page, "alice");
    await signOut(page);

    await page.reload();

    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  });

  test("the next user on the same browser does not see the previous user's cart", async ({ page }) => {
    await signUp(page, "alice");
    const aliceToken = await page.evaluate(() => localStorage.getItem("auth_token"));
    const add = await page.request.post(`${API}/cart`, {
      headers: { authorization: `Bearer ${aliceToken}` },
      data: { personaId: "p-001", quantity: 1 },
    });
    expect(add.ok()).toBeTruthy();
    const personaName: string = (await add.json()).items[0].persona.name;

    await page.goto("/cart");
    await expect(page.getByText(personaName).first()).toBeVisible();

    await signOut(page);
    await signUp(page, "bob");
    // Client-side navigation on purpose: a full page load would drop the in-memory query cache and hide the bug.
    // The cart icon link has no accessible name, so target it by href.
    await page.locator('nav a[href="/cart"]').click();

    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(page.getByText(personaName)).toHaveCount(0);
  });
});
