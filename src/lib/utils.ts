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
