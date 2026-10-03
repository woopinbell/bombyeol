import { open, seed, BASE, check, S } from "./lib.mjs";
import { readFileSync } from "node:fs";
const s = seed();
const KAKAO = process.env.KAKAO === "1";
const { browser, ctx, page, errors } = await open(s.mom);
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const sdk = readFileSync(`${S}/kakao.min.js`);
await ctx.route("https://t1.kakaocdn.net/**", (r) => r.fulfill({ body: sdk, contentType: "application/javascript", headers: { "access-control-allow-origin": "*" } }));
let popup = null;
const kakaoReqs = [];
await ctx.route(/https:\/\/[a-z.]*kakao\.com\/.*/, (r) => { kakaoReqs.push(r.request().url() + " " + (r.request().postData() ?? "")); r.fulfill({ body: "ok", contentType: "text/html" }); });
ctx.on("page", (p) => { popup = p; });
// 1) 이야기 탭: 답을 기다리는 질문
await page.goto(`${BASE}/s/${s.spaceId}/story`, { timeout: 120000 });
const btn = page.getByRole("button", { name: KAKAO ? "카카오톡으로 알리기" : "링크 보내기" });
await btn.waitFor({ timeout: 60000 });
check(true, "물어보기 공유 단추");
await btn.click();
await page.waitForTimeout(3000);
if (KAKAO) {
  const u = kakaoReqs.at(-1) ?? "";
  console.log("  popup:", u.slice(0, 160));
  check(/kakao\.com/.test(u), "카카오 공유 창이 열림");
  if (popup) await popup.close();
  popup = null;
} else {
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(/\/open\/ask\//.test(clip) && !clip.includes("할머니"), `키 없으면 복사(이름 없음): ${clip.replace(/\n/g, " ")}`);
  check(await page.getByText("링크를 복사했어요", { exact: false }).first().isVisible(), "복사 토스트");
}
// 2) 오늘 탭: 기록 시트
await page.goto(`${BASE}/s/${s.spaceId}`);
await page.getByRole("button", { name: /댓글 0/ }).first().click();
const dlg = page.getByRole("dialog");
const share = dlg.getByRole("button", { name: KAKAO ? "어르신께 보내기" : "링크 보내기" });
await share.waitFor({ timeout: 20000 });
check(true, "기록 시트 보내기 단추(부모)");
await page.waitForTimeout(600);
await page.screenshot({ path: `${S}/share-moment${KAKAO ? "-kakao" : ""}.png` });
await share.click();
await page.waitForTimeout(3000);
if (KAKAO) { check(kakaoReqs.length === 2 && decodeURIComponent(kakaoReqs[1]).includes("/open/moment/"), "기록 카카오 공유 창(링크 포함)"); if (popup) await popup.close(); popup = null; }
else { const clip = await page.evaluate(() => navigator.clipboard.readText()); check(/\/open\/moment\//.test(clip), "기록 링크 복사"); }
// 3) 초대 화면
await page.goto(`${BASE}/start/invite/${s.spaceId}`);
await page.getByRole("button", { name: "초대 링크 만들기" }).click();
await page.getByText("초대 코드").waitFor({ timeout: 30000 });
check(await page.getByRole("button", { name: "링크 복사하기" }).isVisible(), "초대 복사 단추");
check(KAKAO === await page.getByRole("button", { name: "카카오톡으로 보내기" }).isVisible(), "초대 카카오톡 단추(키 있을 때만)");
await page.screenshot({ path: `${S}/share-invite${KAKAO ? "-kakao" : ""}.png` });
if (KAKAO) { await page.getByRole("button", { name: "카카오톡으로 보내기" }).click(); await page.waitForTimeout(3000); check(kakaoReqs.length === 3 && decodeURIComponent(kakaoReqs[2]).includes("/invite/"), "초대 카카오 공유 창(링크 포함)"); console.log("  ", decodeURIComponent(kakaoReqs[2]).slice(0, 600)); }
await browser.close();
// 4) 어르신에게는 보내기 단추가 없다
const g = await open(s.grandma);
await g.page.goto(`${BASE}/s/${s.spaceId}/story`);
await g.page.waitForTimeout(4000);
check((await g.page.getByRole("button", { name: /카카오톡으로 알리기|링크 보내기/ }).count()) === 0, "어르신 화면에는 질문 보내기 없음");
await g.browser.close();
const real = errors.filter((e) => !e.includes("caret-color"));
check(real.length === 0, `콘솔 오류 0 ${real.join("|").slice(0, 400)}`);
