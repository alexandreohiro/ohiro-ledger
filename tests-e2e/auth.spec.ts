import { test, expect } from "@playwright/test";

test("página de login renderiza com os campos de credencial", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
});

test("acessar /app sem sessão redireciona para o login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("formulário de login mostra erro com credencial inválida", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("E-mail").fill("usuario-inexistente@teste.com");
  await page.getByLabel("Senha").fill("senha-incorreta-123");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.locator("text=/credencia|inválid|erro/i")).toBeVisible({ timeout: 10_000 });
});
