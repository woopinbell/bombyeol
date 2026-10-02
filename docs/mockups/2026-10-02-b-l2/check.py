"""L2 목업 검사: (1) 앱 스타일에 토큰 밖 값이 없는지 (2) 역할 조합 대비. 실행: python3 check.py"""
import re, sys
html = open("b2.html", encoding="utf-8").read()
app = re.search(r'<style id="app">(.*?)</style>', html, re.S).group(1)
inline = " ".join(re.findall(r'style="([^"]*)"', html))
body = re.sub(r"/\*.*?\*/", "", app, flags=re.S) + " " + inline
bad = []
for m in re.finditer(r"#[0-9A-Fa-f]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|ms|s)\b|rgba?\(", body):
    bad.append(m.group(0))
print("토큰 밖 값:", bad if bad else "없음")

def L(h):
    c = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b):
    x, y = sorted([L(a), L(b)], reverse=True); return (x + 0.05) / (y + 0.05)
P = dict(paper="#F7F1E6", ink="#2C2621", muted="#6F6860", navy="#232B4D", indigo="#34406B", silver="#C7CEDD", gold="#E8C77A",
         pink="#F2A7B3", yellow="#F4CB6E", lsp="#8D867D", deep="#171C33", lsn="#73798B")
checks = [  # (설명, 글자/선, 바탕, 최소)
  ("라이트 본문 fg/bg", "ink", "paper", 7), ("라이트 보조 fg-muted/bg", "muted", "paper", 4.5), ("라이트 테두리 line-strong/bg", "lsp", "paper", 3),
  ("라이트 주 버튼 on-strong/strong", "paper", "navy", 7),
  ("다크 본문", "paper", "deep", 7), ("다크 보조", "silver", "deep", 4.5), ("다크 테두리", "lsn", "deep", 3), ("다크 주 버튼", "navy", "paper", 7),
  ("이야기 본문", "paper", "navy", 7), ("이야기 보조", "silver", "navy", 4.5), ("이야기 테두리", "lsn", "navy", 3),
  ("이야기 면 위 본문(tile·ask)", "paper", "indigo", 7), ("이야기 면 위 보조", "silver", "indigo", 4.5), ("이야기 면 위 골드 라벨", "gold", "indigo", 4.5),
  ("봄 칩 글자 ink/pink", "ink", "pink", 4.5), ("카카오 자리 ink/yellow", "ink", "yellow", 4.5),
]
fail = 0
for name, a, b, need in checks:
    r = cr(P[a], P[b]); ok = r >= need; fail += not ok
    print(f"{'OK ' if ok else 'NO '} {name:28s} {r:5.2f}:1 (기준 {need})")
sys.exit(1 if bad or fail else 0)
