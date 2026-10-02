/** 세로 로고 — 라이트·다크(앱 설정·기기 설정) 바탕에 맞는 파생본을 고른다(image-asset/brand/asset-index.md). */
export function Logo({ alt }: { alt: string }) {
  return (
    <div className="mt-6 self-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG 로고 그대로 */}
      <img
        src="/brand/logo/stacked.svg"
        alt={alt}
        width={168}
        height={200}
        className="dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo/stacked-dark.svg"
        alt={alt}
        width={168}
        height={200}
        className="hidden dark:block"
      />
    </div>
  );
}
