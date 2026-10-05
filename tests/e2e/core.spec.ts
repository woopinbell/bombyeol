import { readFileSync } from "node:fs";
import { encode } from "@auth/core/jwt";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import ko from "../../messages/ko.json";

// 핵심 흐름: 엄마가 사진을 올리고 할머니가 좋아요를 남긴다, 할머니가 이야기를 직접 쓴다
const seed = JSON.parse(readFileSync(process.env.E2E_SEED_OUT!, "utf8")) as {
  spaceId: string;
  mom: string;
  grandma: string;
};

async function signIn(context: BrowserContext, baseURL: string, uid: string) {
  const value = await encode({
    token: { uid, sub: uid, name: "e2e" },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
    maxAge: 60 * 60,
  });
  await context.addCookies([{ name: "authjs.session-token", value, url: baseURL }]);
}

/** 캔버스로 만든 작은 JPEG(실제 업로드 경로를 그대로 탄다) */
async function photo(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 480;
    const g = c.getContext("2d")!;
    g.fillStyle = "#9fc6e6";
    g.fillRect(0, 0, 640, 480);
    return c.toDataURL("image/jpeg", 0.8).split(",")[1];
  });
  return { name: "e2e.jpg", mimeType: "image/jpeg", buffer: Buffer.from(b64, "base64") };
}

const home = `/s/${seed.spaceId}`;

test("엄마가 사진을 올리면 할머니가 보고 좋아요를 남긴다", async ({ browser, baseURL }) => {
  const momContext = await browser.newContext();
  await signIn(momContext, baseURL!, seed.mom);
  const mom = await momContext.newPage();
  await mom.goto(home);
  await expect(mom.getByRole("heading", { name: ko.today.emptyTitle })).toBeVisible();
  await mom
    .locator('input[type="file"]')
    .first()
    .setInputFiles(await photo(mom));
  const sheet = mom.getByRole("dialog", { name: ko.upload.title });
  await sheet.getByLabel(ko.upload.body).fill("e2e 첫 사진");
  await mom.getByRole("button", { name: ko.upload.submit, exact: true }).click();
  await expect(mom.getByText("e2e 첫 사진")).toBeVisible();

  const gmContext = await browser.newContext();
  await signIn(gmContext, baseURL!, seed.grandma);
  const grandma = await gmContext.newPage();
  await grandma.goto(home);
  await expect(grandma.getByText("e2e 첫 사진")).toBeVisible();
  await grandma.getByRole("button", { name: "좋아요", exact: true }).first().click();
  await expect(grandma.getByRole("button", { name: /좋아요 1/ })).toBeVisible();
  await momContext.close();
  await gmContext.close();
});

test("할머니가 이야기를 직접 쓰면 이야기 모음에 보인다", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await signIn(context, baseURL!, seed.grandma);
  const page = await context.newPage();
  await page.goto(`${home}/story`);
  await page.getByRole("button", { name: ko.storyTab.write }).click();
  const sheet = page.getByRole("dialog", { name: ko.storyWrite.title });
  await sheet.getByLabel(ko.storyWrite.titleLabel).fill("e2e 이야기");
  await sheet.getByLabel(ko.storyWrite.body, { exact: true }).fill("옛날에 있었던 일");
  await page.getByRole("button", { name: ko.storyWrite.submit }).click();
  await expect(page.getByText("e2e 이야기")).toBeVisible();
  await context.close();
});
