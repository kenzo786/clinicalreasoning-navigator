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

test("quick start is shown on first run and can be dismissed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Quick Start: 10-minute consultation flow")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss quick start" }).click();
  await expect(page.getByText("Quick Start: 10-minute consultation flow")).toHaveCount(0);
});

test("inserting a linked section enables refresh link workflow", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator("textarea").first();
  await editor.click();
  await editor.type("Initial consultation text.");

  const refreshButton = page.getByRole("button", { name: "Sync Inserted Sections" });
  await expect(refreshButton).toBeDisabled();

  await page.keyboard.press(process.platform === "darwin" ? "Meta+Shift+I" : "Control+Shift+I");
  await expect(page.getByText("Insert Composer Section")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(refreshButton).toBeEnabled();
  await refreshButton.click();
  await expect(page.getByText("Section sync complete").first()).toBeVisible();
});

test("desktop export format supports SOAP and file download", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop-only composer tray test.");

  await page.goto("/");
  const editor = page.locator("textarea").first();
  await editor.click();
  await editor.type("Patient has sore throat for 2 days.");

  await page.getByLabel("Format").selectOption("soap");
  await expect(page.locator("textarea").nth(1)).toContainText("S: Subjective");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  await downloadPromise;
});
