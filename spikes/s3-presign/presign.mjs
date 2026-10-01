import { AwsClient } from "aws4fetch";
const c = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
const base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}`;
async function presign(key, len, type, signLen = true) {
  const u = new URL(`${base}/${key}`); u.searchParams.set("X-Amz-Expires", "300");
  const headers = { "content-type": type }; if (signLen) headers["content-length"] = String(len);
  const req = await c.sign(u.toString(), { method: "PUT", headers, aws: { signQuery: true, allHeaders: true } });
  return req.url;
}
const put = async (url, n, type, extra = {}) => { const r = await fetch(url, { method: "PUT", body: new Uint8Array(n), headers: { "content-type": type, ...extra } }); return `${r.status} ${((await r.text()).match(/<Code>([^<]+)/) || [])[1] || ""}`; };
const k = () => `spike/presign/${crypto.randomUUID()}`;
let u;
u = await presign(k(), 1000, "image/jpeg"); console.log("signed len=1000, PUT 1000       :", await put(u, 1000, "image/jpeg"));
u = await presign(k(), 1000, "image/jpeg"); console.log("signed len=1000, PUT 5000       :", await put(u, 5000, "image/jpeg"));
u = await presign(k(), 1000, "image/jpeg"); console.log("signed len=1000, PUT 500        :", await put(u, 500, "image/jpeg"));
u = await presign(k(), 1000, "image/jpeg"); console.log("signed type=jpeg, PUT as zip    :", await put(u, 1000, "application/zip"));
u = await presign(k(), 1000, "image/jpeg", false); console.log("UNSIGNED len, PUT 5000 (control):", await put(u, 5000, "image/jpeg"));
// 정리
const l = await (await c.fetch(`${base}?list-type=2&prefix=spike/`)).text();
const keys = [...l.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
for (const key of keys) await c.fetch(`${base}/${key}`, { method: "DELETE" });
console.log("cleaned objects:", keys.length);
