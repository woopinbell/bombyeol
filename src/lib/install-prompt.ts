// 안드로이드 크롬의 "홈 화면에 추가" 요청(beforeinstallprompt)을 붙잡아 두었다가 설정 화면의 버튼으로 띄운다.
// 이벤트는 앱을 연 직후 한 번 오므로 가족 홈 틀이 미리 듣는다(PwaSync).

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

let pending: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function listenInstallPrompt() {
  const capture = (event: Event) => {
    event.preventDefault();
    pending = event as InstallPrompt;
    emit();
  };
  const installed = () => {
    pending = null;
    emit();
  };
  window.addEventListener("beforeinstallprompt", capture);
  window.addEventListener("appinstalled", installed);
  return () => {
    window.removeEventListener("beforeinstallprompt", capture);
    window.removeEventListener("appinstalled", installed);
  };
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const canInstall = () => pending !== null;

/** 설치 창을 띄운다. 한 번 쓴 요청은 다시 쓸 수 없다 */
export async function promptInstall() {
  const event = pending;
  pending = null;
  emit();
  if (!event) return;
  await event.prompt();
  await event.userChoice.catch(() => undefined);
}
