import { test, expect } from "@playwright/test";
import { API } from "./helpers";

// B10: changing a filter on the browse page shows the filtered list (not the cached unfiltered one).
test("B10: clicking a specialty filter shows only that specialty", async ({ page, request }) => {
  const all: { name: string }[] = await (await request.get(`${API}/personas`)).json();
  const security: { name: string }[] = await (await request.get(`${API}/personas?specialty=Security`)).json();
  expect(security.length).toBeGreaterThan(0);
  expect(security.length).toBeLessThan(all.length);

  const cards = page.locator('a[href^="/personas/"]');

  await page.goto("/");
  await expect(cards).toHaveCount(all.length);

  await page.getByRole("button", { name: "Security", exact: true }).click();
  await expect(page).toHaveURL(/specialty=Security/);

  await expect(cards).toHaveCount(security.length);
  for (const p of security) {
    await expect(cards.filter({ hasText: p.name })).toHaveCount(1);
  }
});
