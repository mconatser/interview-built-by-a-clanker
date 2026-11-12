import { expect, type Page } from "@playwright/test";

export const API = "http://localhost:3001";

/** Sign up a fresh user through the UI (in-app navigation) and return their token. */
export async function signUp(page: Page, name: string): Promise<string> {
  const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  if (page.url() === "about:blank") await page.goto("/");
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  return (await page.evaluate(() => localStorage.getItem("auth_token")))!;
}
