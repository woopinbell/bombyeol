import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createPrisma } from "@/server/db";
import { isInternalRequest } from "@/server/internal-auth";
import { runDayReminders } from "@/server/jobs/day-reminders";
import { fcmSenderFromEnv } from "@/server/push/fcm";

// Cron(worker.ts scheduled)만 호출한다. 토큰이 없거나 틀리면 존재를 드러내지 않고 404.
export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  if (!(await isInternalRequest(req, env.AUTH_SECRET, "reminders"))) {
    return new Response(null, { status: 404 });
  }
  const sender = fcmSenderFromEnv(env);
  if (!sender || !env.APP_ORIGIN) {
    console.log("[reminders] 발송 설정 또는 APP_ORIGIN 없음 - 건너뜀");
    return Response.json({ skipped: "config" });
  }
  const result = await runDayReminders(createPrisma(), sender, env.APP_ORIGIN);
  console.log("[reminders]", JSON.stringify(result));
  return Response.json(result);
}
