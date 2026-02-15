import { test, expect } from "@playwright/test";

test("loads app and allows basic consultation workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("CRx Navigator")).toBeVisible();

  const editor = page.locator("textarea").first();
  await editor.click();
  await editor.type("Patient seen in consultation.");
  await expect(editor).toContainText("Patient seen in consultation.");

  await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+I" : "Control+Shift+I");
  await expect(page.getByText("Insert Composer Section")).toBeVisible();
  await page.keyboard.press("Escape");
});
