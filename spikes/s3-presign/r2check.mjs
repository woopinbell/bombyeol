import { AwsClient } from "aws4fetch";
const c = new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
const base = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const code = async (r) => `${r.status} ${((await r.text()).match(/<Code>([^<]+)/) || [])[1] || ""}`;
console.log("ListObjectsV2 spike bucket:", await code(await c.fetch(`${base}/${process.env.R2_BUCKET_NAME}?list-type=2&max-keys=1`)));
console.log("ListBuckets (account-wide):", await code(await c.fetch(`${base}/`)));
console.log("ListObjects other bucket name:", await code(await c.fetch(`${base}/bombyeol-scope-probe-nonexistent?list-type=2&max-keys=1`)));
