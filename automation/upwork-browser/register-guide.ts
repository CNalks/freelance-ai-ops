import { mkdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Locator, type Page } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotDir = path.join(__dirname, "screenshots");
const credentialsPath = path.join(__dirname, "credentials.md");
const signupUrl = "https://www.upwork.com/nx/signup/?dest=home";

const firstName = "Zhijian";
const lastName = "Lin";
const email = "a874448514@gmail.com";
const country = "China";

function createPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const punctuation = "!@#$%^&*()-_=+";
  const randomChars = Array.from({ length: 16 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  return `Upw!${randomChars}${punctuation[crypto.randomInt(punctuation.length)]}`;
}

async function saveCredentials(password: string): Promise<void> {
  const body = [
    "# Upwork Credentials",
    "",
    `Email: ${email}`,
    `Password: ${password}`,
    `First Name: ${firstName}`,
    `Last Name: ${lastName}`,
    `Country: ${country}`,
    "",
    `Generated At: ${new Date().toISOString()}`,
    "",
    "This file is intentionally gitignored.",
    "",
  ].join("\n");

  await writeFile(credentialsPath, body, "utf8");
}

async function clickFirstVisible(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    const count = await locator.count();
    if (count === 0) {
      continue;
    }

    const first = locator.first();
    if (!(await first.isVisible())) {
      continue;
    }

    await first.click();
    return;
  }

  throw new Error("No visible locator was clickable.");
}

async function pageContainsText(page: Page, pattern: RegExp): Promise<boolean> {
  try {
    const text = await page.locator("body").innerText();
    return pattern.test(text);
  } catch {
    return false;
  }
}

async function handleBlockingChallenge(page: Page, stage: string): Promise<void> {
  const challengeSignals = [
    /cloudflare/i,
    /verify you are human/i,
    /security check/i,
    /ray id/i,
    /checking your browser/i,
    /captcha/i,
  ];

  for (const signal of challengeSignals) {
    if (await pageContainsText(page, signal)) {
      await waitForManualIntervention(page, `${stage}-challenge`);
      return;
    }
  }
}

async function clickFreelancerChoice(page: Page): Promise<void> {
  await clickFirstVisible([
    page.locator("#button-box-4"),
    page.locator('[aria-labelledby="button-box-4"]'),
    page.getByLabel(/i want to work/i),
    page.getByRole("radio", { name: /i want to work/i }),
    page.getByText(/i'?m a freelancer,?\s*looking for work/i),
    page.getByText(/i want to work/i),
  ]);
}

async function continueFromChoice(page: Page): Promise<void> {
  await clickFirstVisible([
    page.getByRole("button", { name: /^apply as a freelancer$/i }),
    page.getByRole("button", { name: /^join as a freelancer$/i }),
    page.getByRole("button", { name: /^create account$/i }),
    page.getByRole("button", { name: /apply/i }),
    page.getByRole("button", { name: /join/i }),
  ]);
}

async function fillTextbox(page: Page, labelPattern: RegExp, value: string, fallbackName?: string): Promise<void> {
  const locators: Locator[] = [
    page.getByLabel(labelPattern),
    page.getByRole("textbox", { name: labelPattern }),
    page.getByPlaceholder(labelPattern),
  ];

  if (fallbackName) {
    locators.push(page.locator(`[name="${fallbackName}"]`));
    locators.push(page.locator(`input[name="${fallbackName}"]`));
  }

  for (const locator of locators) {
    const count = await locator.count();
    if (count === 0) {
      continue;
    }

    const first = locator.first();
    if (!(await first.isVisible())) {
      continue;
    }

    await first.fill(value);
    return;
  }

  throw new Error(`Could not find field matching ${labelPattern.toString()}.`);
}

async function selectCountry(page: Page): Promise<void> {
  const nativeSelect = page.locator('select[name="country"], select#country');
  if (await nativeSelect.count()) {
    await nativeSelect.first().selectOption({ label: country });
    return;
  }

  const passwordInput = page.locator("#password-input");
  if (await passwordInput.count()) {
    await passwordInput.first().press("Tab");
    await page.keyboard.type(country);
    await page.waitForTimeout(1000);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    return;
  }

  throw new Error("Could not select China in the country field.");
}

async function acceptTerms(page: Page): Promise<void> {
  const checkbox = page.locator("#checkbox-terms");
  if (await checkbox.count()) {
    await checkbox.first().click();
    return;
  }

  const allCheckboxes = page.locator('input[type="checkbox"]');
  const count = await allCheckboxes.count();
  if (count >= 2) {
    await allCheckboxes.nth(1).check();
  }
}

async function submitSignup(page: Page): Promise<void> {
  const submitButton = page.locator("#button-submit-form");
  if (await submitButton.count()) {
    await submitButton.first().click();
    return;
  }

  await clickFirstVisible([
    page.getByRole("button", { name: /^create my account$/i }),
    page.getByRole("button", { name: /^create account$/i }),
    page.getByRole("button", { name: /^sign up$/i }),
  ]);
}

async function takeScreenshot(page: Page, prefix: string): Promise<string> {
  const screenshotPath = path.join(
    screenshotDir,
    `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`,
  );

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  console.log(`Saved screenshot to ${screenshotPath}`);
  return screenshotPath;
}

async function waitForManualIntervention(page: Page, reason: string): Promise<void> {
  await takeScreenshot(page, reason);
  console.log(`Manual step required: ${reason}. Waiting 120 seconds for you to complete it in the browser.`);
  await page.waitForTimeout(120000);
}

async function assertEmailAvailable(page: Page): Promise<void> {
  if (await pageContainsText(page, /this email is already in use/i)) {
    await takeScreenshot(page, "email-already-in-use");
    throw new Error(`Upwork reports that ${email} is already in use. Registration cannot continue with this email.`);
  }
}

async function fillSignupForm(page: Page, password: string): Promise<void> {
  if (await page.locator("#first-name-input").count()) {
    await page.locator("#first-name-input").fill(firstName);
  } else {
    await fillTextbox(page, /first name/i, firstName, "firstName");
  }

  if (await page.locator("#last-name-input").count()) {
    await page.locator("#last-name-input").fill(lastName);
  } else {
    await fillTextbox(page, /last name/i, lastName, "lastName");
  }

  if (await page.locator("#redesigned-input-email").count()) {
    const emailInput = page.locator("#redesigned-input-email");
    await emailInput.fill(email);
    await emailInput.press("Tab");
  } else {
    await fillTextbox(page, /email/i, email, "email");
  }
  await page.waitForTimeout(1000);
  await assertEmailAvailable(page);

  if (await page.locator("#password-input").count()) {
    await page.locator("#password-input").fill(password);
  } else {
    await fillTextbox(page, /password/i, password, "password");
  }

  await selectCountry(page);
  await acceptTerms(page);
}

async function handlePostSubmit(page: Page): Promise<void> {
  const manualSignals = [
    /captcha/i,
    /verify your email/i,
    /check your email/i,
    /security check/i,
    /verify/i,
  ];

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  await handleBlockingChallenge(page, "post-submit");

  for (const signal of manualSignals) {
    if (await pageContainsText(page, signal)) {
      await waitForManualIntervention(page, "manual-step");
      return;
    }
  }

  await takeScreenshot(page, "signup-result");
}

async function main(): Promise<void> {
  await mkdir(screenshotDir, { recursive: true });
  const password = createPassword();
  await saveCredentials(password);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 150,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  try {
    await page.goto(signupUrl, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);
    await handleBlockingChallenge(page, "signup");

    await clickFreelancerChoice(page);
    await continueFromChoice(page);
    await page.waitForLoadState("domcontentloaded");
    await handleBlockingChallenge(page, "form");
    if (!/signup/i.test(page.url())) {
      throw new Error(`Unexpected URL after freelancer selection: ${page.url()}`);
    }
    await fillSignupForm(page, password);
    await submitSignup(page);
    await handlePostSubmit(page);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
