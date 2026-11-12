import { test, expect } from "@playwright/test";

const API = "http://localhost:3001";

// B6: the browse card shows the same price as the API and the detail page.
test("B6: persona card price matches the API price", async ({ page, request }) => {
  const persona = await (await request.get(`${API}/personas/p-001`)).json();
  const expected = `$${persona.price.toFixed(2)}`;

  await page.goto("/");
  const card = page.getByRole("link", { name: new RegExp(persona.name) });
  await expect(card).toContainText(`${expected}/mo`);

  await card.click();
  await expect(page.getByText(expected, { exact: true }).first()).toBeVisible();
});
