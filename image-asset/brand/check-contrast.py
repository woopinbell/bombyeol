"""tokens.json의 역할 조합 대비 검사(WCAG 2.x 상대 휘도). 실행: python3 check-contrast.py [--md]
코드 이식 때 같은 표를 단위 테스트로 옮긴다(Phase 0 chore(design-system))."""
import json, sys
from pathlib import Path
T = json.loads((Path(__file__).parent / "tokens.json").read_text(encoding="utf-8"))
P = T["palette"]
def hexof(n): return P.get(n, n)
def L(h):
    c = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b):
    x, y = sorted([L(hexof(a)), L(hexof(b))], reverse=True); return (x + 0.05) / (y + 0.05)
rows = []
for mode, r in T["roles"].items():
    rows += [(mode, "본문 fg / bg", r["fg"], r["bg"], 7.0), (mode, "보조 fg-muted / bg", r["fg-muted"], r["bg"], 4.5),
             (mode, "누를 수 있는 테두리 line-strong / bg", r["line-strong"], r["bg"], 3.0),
             (mode, "주 버튼 on-strong / strong", r["on-strong"], r["strong"], 7.0),
             (mode, "강조 면 위 본문 / surface", "paper", r["surface"], 7.0)]
rows += [("night", "골드 라벨 / navy", "starlight-gold", "night-navy", 4.5), ("night", "골드 라벨 / indigo", "starlight-gold", "night-indigo", 4.5),
         ("dark", "골드 / deep", "starlight-gold", "night-deep", 4.5)]
rows += [("봄", f"ink / {s}", "ink", s, 4.5) for s in ("spring-pink", "spring-green", "spring-yellow", "spring-sky")]
# 금지 조합(통과하면 안 됨 — 규칙 문서화용)
banned = [("금지", "gold 글자 / paper", "starlight-gold", "paper", 4.5), ("금지", "봄 색 글자 / paper", "spring-pink", "paper", 4.5),
          ("금지(장식만)", "silver 테두리 / paper", "night-silver", "paper", 3.0), ("금지(장식만)", "indigo 테두리 / navy", "night-indigo", "night-navy", 3.0)]
fail = 0; md = "--md" in sys.argv
if md: print("| 모드 | 조합 | 대비 | 기준 | 결과 |\n|---|---|---|---|---|")
for mode, name, a, b, need in rows + banned:
    r = cr(a, b); ok = r >= need; is_banned = mode.startswith("금지")
    good = (not ok) if is_banned else ok; fail += not good
    res = ("쓰지 않음(기준 미달 확인)" if is_banned else "통과") if good else "**실패**"
    print(f"| {mode} | {name} | {r:.2f}:1 | {need} | {res} |" if md else f"{'OK ' if good else 'NG '} {mode:10s} {name:34s} {r:5.2f}:1 (기준 {need})")
sys.exit(1 if fail else 0)
