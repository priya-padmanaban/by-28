import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { validatePack } from "../lib/content/schema";
import { replay, ending } from "../lib/game/engine";

const pack = validatePack(
  JSON.parse(readFileSync("content/by-28.json", "utf8")),
);
for (const mobile of [false, true]) {
  test(
    mobile ? "authored mobile life" : "authored keyboard life",
    async ({ page }) => {
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
      await activate(pack.ui.start);
      const choices: string[] = [];
      for (let i = 0; i < 20; i++) {
        const choice = pack.scenes[i].choices[mobile ? i % 3 : 0];
        choices.push(choice.id);
        const radio = page.getByRole("radio", {
          name: choice.label,
          exact: true,
        });
        await radio.focus();
        await page.keyboard.press("Space");
        await activate(pack.ui.confirmChoice);
        await expect(
          page.getByText(choice.outcome, { exact: true }),
        ).toBeVisible();
        if (i === 0) {
          await page.reload();
          await activate(pack.ui.resume);
          await expect(page.getByRole("radio")).toHaveCount(0);
        }
        await activate(pack.ui.continue);
      }
      const expected = ending(pack, replay(pack, choices));
      await expect(
        page.getByRole("heading", { name: pack.ui.endingHeading, exact: true }),
      ).toBeVisible();
      for (const question of expected.questions) {
        await activate(question.label);
        await expect(
          page.locator('[data-answer-id="' + question.answer.id + '"]'),
        ).toBeVisible();
      }
      await page
        .getByRole("button", { name: pack.ui.evidenceLink, exact: true })
        .first()
        .click();
      await expect(page.locator(".timeline li")).toHaveCount(20);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path:
          "reports/" +
          (mobile ? "authored-mobile.png" : "authored-desktop.png"),
        fullPage: true,
      });
      await page.reload();
      await activate(pack.ui.resume);
      await expect(
        page.getByRole("heading", { name: pack.ui.endingHeading, exact: true }),
      ).toBeVisible();
    },
  );
}
