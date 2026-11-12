import { test, expect } from "@playwright/test";
import { API, signUp } from "./helpers";

// B16: the detail page and the favorites page share the ["favorites"] query key and must agree on its shape.
test.describe("B16: favorites cache shared by detail and favorites pages", () => {
  test("favorites page, then a persona's detail page", async ({ page }) => {
    const token = await signUp(page, "gail");
    await page.request.post(`${API}/favorites`, {
      headers: { authorization: `Bearer ${token}` },
      data: { personaId: "p-001" },
    });
    const name = (await (await page.request.get(`${API}/personas/p-001`)).json()).name;

    await page.getByRole("link", { name: "Favorites" }).click();
    await page.getByRole("link", { name: new RegExp(name) }).click();

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
  });

  test("a persona's detail page, then the favorites page", async ({ page }) => {
    const token = await signUp(page, "hank");
    await page.request.post(`${API}/favorites`, {
      headers: { authorization: `Bearer ${token}` },
      data: { personaId: "p-001" },
    });
    const name = (await (await page.request.get(`${API}/personas/p-001`)).json()).name;

    await page.getByRole("link", { name: new RegExp(name) }).first().click();
    await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
    await page.getByRole("link", { name: "Favorites" }).click();

    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    await expect(page.getByText("You haven't favorited any personas yet.")).toHaveCount(0);
  });
});
