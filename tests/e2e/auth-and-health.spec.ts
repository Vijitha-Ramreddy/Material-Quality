import { expect, test } from "@playwright/test";

test("public login page renders without an authenticated session", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByPlaceholder("Email address")).toBeVisible();
  await expect(page.getByPlaceholder("Password")).toBeVisible();
});

test("invalid credentials are handled by the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill("nobody@example.invalid");
  await page.getByPlaceholder("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
});

test("protected application routes redirect anonymous users", async ({ page }) => {
  await page.goto("/users");
  await expect(page).toHaveURL(/\/login\?next=%2Fusers/);
});

test("Supabase health endpoint is public and returns structured JSON", async ({ request }) => {
  const response = await request.get("/api/health/supabase");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(["connected", "error"]).toContain(body.status);
  expect(body.database).toBe("reachable");
});
