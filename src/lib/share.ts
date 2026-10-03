// 공유하기(ARCHITECTURE §7): 카카오톡 공유가 1급 경로(어르신은 푸시보다 카카오톡을 본다), 없으면 기기 공유, 링크 복사.
// 서버 비용 0 - 메시지는 사용자가 자기 카카오톡으로 보낸다(알림톡 같은 건당 과금 채널은 쓰지 않는다).
// 공유 문구에는 이름, 아이, 임신 같은 내용을 넣지 않는다(대화방 미리보기에 그대로 보인다, PRIVACY §3).

// 카카오 JavaScript SDK(공식 CDN, 버전 고정과 무결성 해시 - developers.kakao.com 다운로드 페이지와 직접 받은 파일로 확인)
const KAKAO_SDK = {
  src: "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js",
  integrity: "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy",
};

/** 카카오톡 메시지 한 장: 제목, 설명, 버튼 하나, 여는 주소(같은 출처) */
export type ShareContent = { title: string; text: string; button: string; url: string };

type KakaoLink = { mobileWebUrl: string; webUrl: string };
type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (settings: {
      objectType: "feed";
      content: { title: string; description: string; imageUrl: string; link: KakaoLink };
      buttons: { title: string; link: KakaoLink }[];
    }) => void;
  };
};

const kakaoKey = () => process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/** 카카오톡 공유를 쓸 수 있나(키가 빌드에 들어 있어야 한다, ENV_MANIFEST Phase 6) */
export const hasKakao = () => Boolean(kakaoKey());

let loading: Promise<KakaoSdk> | null = null;

function loadKakao(): Promise<KakaoSdk> {
  const key = kakaoKey();
  if (!key) return Promise.reject(new Error("kakao key missing"));
  loading ??= new Promise<KakaoSdk>((resolve, reject) => {
    const ready = () => {
      const sdk = (window as Window & { Kakao?: KakaoSdk }).Kakao;
      if (!sdk) return reject(new Error("kakao sdk missing"));
      if (!sdk.isInitialized()) sdk.init(key);
      resolve(sdk);
    };
    const script = document.createElement("script");
    script.src = KAKAO_SDK.src;
    script.integrity = KAKAO_SDK.integrity;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("kakao sdk load failed"));
    document.head.appendChild(script);
  }).catch((error) => {
    loading = null; // 다음 누름에 다시 시도
    throw error;
  });
  return loading;
}

/** 카카오톡으로 보내기: 휴대폰은 카카오톡 앱, 컴퓨터는 카카오 창이 열린다. 보냈는지는 알 수 없다 */
export async function shareKakao(content: ShareContent) {
  const sdk = await loadKakao();
  const link = { mobileWebUrl: content.url, webUrl: content.url };
  sdk.Share.sendDefault({
    objectType: "feed",
    content: {
      title: content.title,
      description: content.text,
      imageUrl: new URL("/brand/og/og-image.png", window.location.origin).toString(),
      link,
    },
    buttons: [{ title: content.button, link }],
  });
}

export const hasDeviceShare = () => typeof navigator !== "undefined" && "share" in navigator;

/** 기기 공유 창. 닫으면 canceled */
export async function shareDevice(content: ShareContent): Promise<"shared" | "canceled"> {
  try {
    await navigator.share({ title: content.title, text: content.text, url: content.url });
    return "shared";
  } catch {
    return "canceled";
  }
}

/** 문구와 링크를 함께 복사한다(카카오톡 대화창에 붙여 넣기) */
export async function copyShare(content: ShareContent) {
  try {
    await navigator.clipboard.writeText(`${content.text}\n${content.url}`);
    return true;
  } catch {
    return false;
  }
}

/** 화면 경로를 지금 출처의 절대 주소로(알림과 같은 `/open/...` 입구) */
export const absoluteUrl = (path: string) => new URL(path, window.location.origin).toString();
