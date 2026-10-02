import { useTranslations } from "next-intl";
import { signInWith } from "@/app/(onboarding)/login/actions";

/**
 * 카카오·Google 로그인 버튼 — 각 사 공식 가이드 값 그대로(DESIGN §12 외부 로그인 버튼, public/brand/third-party).
 * 두 버튼은 같은 크기(Google 가이드: 다른 로그인보다 덜 눈에 띄면 안 됨), 카카오가 위(어르신 기본 경로).
 * 자바스크립트 없이 동작하는 폼 전송.
 */
export function SocialSignIn({ next }: { next: string }) {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-3">
      <form action={signInWith}>
        <input type="hidden" name="provider" value="kakao" />
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          data-press=""
          className="press flex min-h-(--touch-elder) w-full items-center justify-center gap-2 rounded-[var(--kakao-radius)] bg-kakao px-4 text-title-s font-medium text-kakao-label"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 공식 심볼 그대로(이미지 최적화 꺼짐) */}
          <img src="/brand/third-party/kakao-symbol.svg" alt="" width={22} height={21} />
          {t("kakao")}
        </button>
      </form>
      <form action={signInWith}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          data-press=""
          className="press flex min-h-(--touch-elder) w-full items-center justify-center gap-2.5 rounded-md border border-google-stroke bg-google px-3 text-title-s font-medium text-google-label"
        >
          {/* 공식 G 로고 그대로 — 라이트·다크 버튼 바탕에 맞는 공식 에셋을 고른다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/third-party/google-g.svg"
            alt=""
            width={20}
            height={20}
            className="dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/third-party/google-g-dark.svg"
            alt=""
            width={20}
            height={20}
            className="hidden dark:block"
          />
          {t("google")}
        </button>
      </form>
    </div>
  );
}
