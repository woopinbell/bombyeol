import { getFormatter, getTranslations } from "next-intl/server";
import { bytesForDisplay, storageRatio } from "@/lib/storage-display";

/**
 * 가족 앨범 저장 공간(G-03): 쓴 양과 한도, 막대. 올리는 중인 파일도 한도 판정에 들어가므로 함께 센다.
 * 막대는 굵은 테두리 안의 면으로 보이고 글자로도 같은 내용을 쓴다(색만으로 전하지 않는다).
 */
export async function StorageMeter({
  usedBytes,
  limitBytes,
}: {
  usedBytes: number;
  limitBytes: number;
}) {
  const t = await getTranslations("usTab");
  const format = await getFormatter();
  const size = (bytes: number) => {
    const { value, unit, fraction } = bytesForDisplay(bytes);
    return format.number(value, { style: "unit", unit, maximumFractionDigits: fraction });
  };
  const { ratio, nearFull } = storageRatio(usedBytes, limitBytes);
  const used = size(usedBytes);
  const limit = size(limitBytes);
  return (
    <section aria-labelledby="storage-heading" className="flex flex-col gap-3">
      <h2 id="storage-heading" className="text-title font-heavy">
        {t("storageTitle")}
      </h2>
      <div
        role="meter"
        aria-labelledby="storage-heading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuetext={t("storageUsed", { used, limit })}
        className="h-4 overflow-hidden rounded-sm border-(length:--bw) border-line-strong"
      >
        <div className="h-full bg-strong" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="font-bold tabular-nums">{t("storageUsed", { used, limit })}</p>
      {nearFull ? <p className="font-bold">{t("storageNearFull")}</p> : null}
    </section>
  );
}
