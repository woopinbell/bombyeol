// S-5 스파이크: 백그라운드 수신. 공개 설정값은 등록 URL 쿼리로 받는다(파일에 키를 두지 않음).
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

const params = Object.fromEntries(new URL(self.location.href).searchParams);
firebase.initializeApp(params);
firebase.messaging();
