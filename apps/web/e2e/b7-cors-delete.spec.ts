import { test, expect } from "@playwright/test";
import { API, signUp } from "./helpers";

// B7: the browser must be allowed to send DELETE to the API (cart remove, unfavorite).
test.describe("B7: DELETE requests from the web app", () => {
  test("a cross-origin DELETE from the page reaches the API", async ({ page }) => {
    const token = await signUp(page, "dave");
    await page.request.post(`${API}/favorites`, {
      headers: { authorization: `Bearer ${token}` },
      data: { personaId: "p-001" },
    });

    // fetch from the app's origin (:5173) goes through the browser's CORS preflight, like the app's own calls.
    const result = await page.evaluate(
      async ({ api, token }) => {
        try {
          const res = await fetch(`${api}/favorites/p-001`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          return { status: res.status };
        } catch (e) {
          return { error: String(e) };
        }
      },
      { api: API, token },
    );

    expect(result).toEqual({ status: 200 });
  });
});
