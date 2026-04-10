import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, "screenshots");

async function clickFreelancerChoice(page: Page): Promise<void> {
  const options = [
    page.getByLabel(/i want to work/i),
    page.getByRole("radio", { name: /i want to work/i }),
    page.getByText(/i want to work/i),
  ];

  for (const option of options) {
    const count = await option.count();
    if (count === 0) {
      continue;
    }

    await option.first().click();
    return;
  }

  throw new Error('Could not find the "I want to work" option on the Upwork sign-up page.');
}

async function continueFromChoice(page: Page): Promise<void> {
  const buttons = [
    page.getByRole("button", { name: /^apply as a freelancer$/i }),
    page.getByRole("button", { name: /^join as a freelancer$/i }),
    page.getByRole("button", { name: /apply/i }),
    page.getByRole("button", { name: /join/i }),
  ];

  for (const button of buttons) {
    const count = await button.count();
    if (count === 0) {
      continue;
    }

    await button.first().click();
    return;
  }

  throw new Error("Could not find the button to continue as a freelancer.");
}

async function main(): Promise<void> {
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 150,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  try {
    await page.goto("https://www.upwork.com/nx/signup/?dest=home", {
      waitUntil: "domcontentloaded",
    });

    await clickFreelancerChoice(page);
    await continueFromChoice(page);

    await page.waitForLoadState("domcontentloaded");
    await page.pause();

    const screenshotPath = path.join(
      screenshotDir,
      `upwork-signup-complete-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
    );

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`Saved screenshot to ${screenshotPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
