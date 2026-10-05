import { createCn } from "cn/config";

/**
 * 클래스 병합. 토큰 v1의 이름(DESIGN.md §12)을 알려 주지 않으면 `text-body`(글자 크기)를
 * `text-fg`(글자 색)와 같은 묶음으로 보고 지운다.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["caption", "body", "title-s", "title", "display"] }],
      "font-weight": [{ font: ["regular", "medium", "bold", "heavy"] }],
    },
  },
});

/**
 * 날짜, "숫자 + 단위"처럼 중간에서 줄을 바꾸면 읽기 어려운 짧은 말을 한 덩어리로(띄어쓰기를 줄바꿈 없는 공백으로).
 * 한글은 keep-all이라 띄어쓰기에서만 줄이 바뀐다 - 글자 더 크게, 320px에서 "3월 / 1일"로 쪼개지지 않게.
 */
export const keepTogether = (text: string) => text.replace(/ /g, "\u00a0");
