import { test, expect, type APIRequestContext } from "@playwright/test";
import { API, signUp } from "./helpers";

async function favoriteIds(request: APIRequestContext, token: string): Promise<string[]> {
  const res = await request.get(`${API}/favorites`, { headers: { authorization: `Bearer ${token}` } });
  return (await res.json()).favorites.map((p: { id: string }) => p.id);
}

// B8: the heart on the detail page adds a favorite when it isn't one, and removes it when it is.
test("B8: favorite toggle on the detail page adds, then removes", async ({ page }) => {
  const token = await signUp(page, "fran");
  await page.goto("/personas/p-002");

  // The heart button has no accessible name. It is the button right after "Add to Cart".
  const heart = page.getByRole("button", { name: "Add to Cart" }).locator("xpath=following-sibling::button[1]");

  await heart.click();
  await expect.poll(() => favoriteIds(page.request, token)).toEqual(["p-002"]);
  await expect(heart.locator("svg")).toHaveAttribute("fill", "currentColor");

  await heart.click();
  await expect.poll(() => favoriteIds(page.request, token)).toEqual([]);
  await expect(heart.locator("svg")).toHaveAttribute("fill", "none");
});
