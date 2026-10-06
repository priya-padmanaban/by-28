import { test, expect } from "@playwright/test";
for (const mobile of [false, true])
  test(mobile ? "mobile full life" : "keyboard full life", async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 320, height: 700 });
    const activate = async (name: string) => {
      const button = page.getByRole("button", { name, exact: true });
      if (mobile) await button.click();
      else {
        await button.focus();
        await page.keyboard.press("Enter");
      }
    };
    await page.goto("/");
    await activate("[ui.start]");
    for (let i = 0; i < 20; i++) {
      const radio = page.getByRole("radio").first();
      if (mobile) await radio.check();
      else {
        await radio.focus();
        await page.keyboard.press("Space");
      }
      await activate("[ui.confirmChoice]");
      if (i === 0) {
        await page.reload();
        await activate("[ui.resume]");
        await expect(
          page.getByRole("heading", { name: "[ui.rememberedHeading]" }).first(),
        ).toBeVisible();
      }
      await activate("[ui.continue]");
    }
    await expect(
      page.getByRole("heading", { name: "[ui.endingHeading]" }),
    ).toBeVisible();
    await activate("[q01.label]");
    await expect(page.locator('[data-answer-id="q01_low"]')).toBeVisible();
    await page
      .getByRole("button", { name: "[ui.evidenceLink]", exact: true })
      .first()
      .click();
    await expect(page.locator(".timeline li")).toHaveCount(20);
    await expect(
      page
        .locator(".timeline")
        .getByRole("heading", { name: "[ui.outcomeHeading]", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "[ui.showActual]", exact: true })
      .first()
      .click();
    await expect(
      page
        .locator(".timeline")
        .getByRole("heading", { name: "[ui.outcomeHeading]", exact: true }),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "[ui.anotherLife]", exact: true })
      .click();
    await page
      .getByRole("button", { name: "[ui.resetCancel]", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "[ui.endingHeading]" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "[ui.anotherLife]", exact: true })
      .click();
    await page
      .getByRole("button", { name: "[ui.resetConfirm]", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "[ui.start]", exact: true }),
    ).toBeVisible();
  });
test("corrupt and incompatible saves require explicit reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("by28.save.v1", "{"));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "[ui.saveCorruptTitle]" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "[ui.reset]", exact: true }).click();
  await page
    .getByRole("button", { name: "[ui.resetConfirm]", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "[ui.start]", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("by28.save.v1")!);
    s.contentVersion = "other";
    localStorage.setItem("by28.save.v1", JSON.stringify(s));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "[ui.saveIncompatibleTitle]" }),
  ).toBeVisible();
});
test("blocked storage allows play and another tab freezes writes", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator('aside[role="alert"]')).toContainText(
    "[ui.storageUnavailable]",
  );
  await page.getByRole("button", { name: "[ui.start]", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "[ui.confirmChoice]", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "[ui.rememberedHeading]" }).first(),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "[ui.start]", exact: true }).click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new StorageEvent("storage", { key: "by28.save.v1", newValue: "{}" }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "[ui.saveConflictTitle]" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "[ui.continue]", exact: true }),
  ).toBeDisabled();
});
test("320px at 200 percent text size retains controls and no overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await page.addStyleTag({
    content: "html{font-size:200%}body{font-size:36px}",
  });
  await page.getByRole("button", { name: "[ui.start]", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
