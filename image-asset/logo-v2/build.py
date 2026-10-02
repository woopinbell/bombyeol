"""봄별 로고 v2 후보 생성기 (2026-10-02, Q-LOGO).
실행: python3 build.py <PretendardVariable.woff2 경로>   → 이 폴더에 SVG를 쓴다.
- 심볼 3안(S1 보드 충실 다섯 꽃잎 / S2 아이콘과 같은 네 꽃잎 / S3 그라디언트, 로고 전용 예외)
- 워드마크 2안(W1 둥근 단선 / W2 손맛 곡선) — 한글은 직접 그린 경로(폰트 의존·라이선스 없음)
- 영문 BOMBYEOL은 Pretendard(OFL) 글리프를 윤곽선으로 변환(OFL은 로고 사용 허용)
색은 DESIGN.md §3 팔레트만 쓴다."""
import math, sys, io
from pathlib import Path
OUT = Path(__file__).parent
C = dict(paper="#F7F1E6", ink="#2C2621", navy="#232B4D", indigo="#34406B", silver="#C7CEDD", gold="#E8C77A",
         pink="#F2A7B3", green="#A9C88C", yellow="#F4CB6E", sky="#A8D8E8")

def star_pts(cx, cy, R, r, rot=-90):
    pts = []
    for i in range(10):
        a = math.radians(rot + i * 36); rr = R if i % 2 == 0 else r
        pts.append(f"{cx + rr*math.cos(a):.2f},{cy + rr*math.sin(a):.2f}")
    return " ".join(pts)

def spark(cx, cy, R, k=0.28):
    r = R * k
    return (f"M{cx} {cy-R} Q{cx+r*0.35} {cy-r*0.35} {cx+R} {cy} Q{cx+r*0.35} {cy+r*0.35} {cx} {cy+R} "
            f"Q{cx-r*0.35} {cy+r*0.35} {cx-R} {cy} Q{cx-r*0.35} {cy-r*0.35} {cx} {cy-R}Z")

def rstar(cx, cy, R, fill, gap=None, round_=5.5):
    """둥근 모서리 별: 같은 색 채움+선(round join). gap이면 바탕색 테두리로 겹침 분리."""
    pts = star_pts(cx, cy, R, R * 0.5)
    g = ""
    if gap:
        g = f'<polygon points="{pts}" fill="{gap}" stroke="{gap}" stroke-width="{round_*2+7}" stroke-linejoin="round"/>'
    return g + f'<polygon points="{pts}" fill="{fill}" stroke="{fill}" stroke-width="{round_*2}" stroke-linejoin="round"/>'

# ── 심볼(100×100 격자) ─────────────────────────────────────────────
def symbol(variant, bg, mono=None, dark=False, small=False):
    star_c = mono or (C["silver"] if dark else C["navy"])
    gapc = bg
    parts = []
    if variant == "S1":   # 보드 1번: 다섯 꽃잎 방사형 + 가운데 반짝임 구멍 + 오른쪽 아래 별
        cx, cy, d, r = 40, 41, 15.5, 13.5
        for i, k in enumerate(["pink", "yellow", "green", "pink", "sky"]):  # 같은 색이 이웃하지 않게
            a = math.radians(-90 - 36 + i * 72)
            parts.append(f'<circle cx="{cx + d*math.cos(a):.2f}" cy="{cy + d*math.sin(a):.2f}" r="{r}" fill="{mono or C[k]}"/>')
        parts.append(f'<path d="{spark(cx, cy, 10.5)}" fill="{bg}"/>')
        parts.append(rstar(72, 70, 17, star_c, gapc))
        if not small: parts.append(f'<path d="{spark(82, 20, 7)}" fill="{mono or (C["gold"] if dark else C["green"])}"/>')
    elif variant == "S2":  # 아이콘과 같은 네 꽃잎(오늘 탭 아이콘 확대판)
        for x, y, r, k in [(30, 32, 17, "pink"), (54, 27, 15, "green"), (57, 51, 16, "sky"), (33, 56, 15, "yellow")]:
            parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{mono or C[k]}"/>')
        parts.append(f'<circle cx="44" cy="42" r="6.5" fill="{bg}"/>')
        parts.append(rstar(72, 70, 17, star_c, gapc))
        if not small: parts.append(f'<path d="{spark(85, 20, 7)}" fill="{mono or C["gold"] if dark else mono or C["green"]}"/>')
    elif variant == "S3":  # 보드의 번지는 색감(그라디언트는 로고 전용 예외 — 앱 UI에는 금지 유지)
        if mono:
            return symbol("S1", bg, mono, dark, small)
        parts.append('<defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">'
                     f'<stop offset="0" stop-color="{C["pink"]}"/><stop offset=".45" stop-color="{C["yellow"]}"/>'
                     f'<stop offset=".75" stop-color="{C["green"]}"/><stop offset="1" stop-color="{C["sky"]}"/></linearGradient></defs>')
        blob = "".join(f'<circle cx="{40 + 15.5*math.cos(math.radians(-126 + i*72)):.2f}" cy="{41 + 15.5*math.sin(math.radians(-126 + i*72)):.2f}" r="13.5"/>' for i in range(5)) + '<circle cx="40" cy="41" r="12"/>'
        parts.append(f'<g fill="url(#g3)">{blob}</g>')
        parts.append(f'<path d="{spark(40, 41, 10.5)}" fill="{bg}"/>')
        parts.append(rstar(72, 70, 17, star_c, gapc))
        if not small: parts.append(f'<path d="{spark(82, 20, 7)}" fill="{C["gold"] if dark else C["green"]}"/>')
    return "".join(parts)

# ── 한글 워드마크(직접 그린 단선) ────────────────────────────────────
def hangul(style):
    """봄(0..100) 별(116..226), 높이 0..120. 획 끝·꺾임 모두 둥글게."""
    if style == "W1":
        d = [
            # 봄: ㅂ / ㅗ / ㅁ
            "M20 6 V44", "M80 6 V44", "M20 25 H80", "M20 44 H80",
            "M50 44 V60", "M6 62 H94",
            "M22 78 H78 V114 H22 Z",
            # 별: ㅂ ㅕ / ㄹ
            "M126 8 V52", "M170 8 V52", "M126 30 H170", "M126 52 H170",
            "M212 2 V60", "M190 20 H212", "M190 40 H212",
            "M130 72 H210 V94 H130 V116 H214",
        ]
    else:  # W2: 같은 뼈대에 손맛 — 살짝 기운 가로획, 둥근 ㅁ, ㄹ 끝이 밑줄 곡선으로
        d = [
            "M20 7 Q19 26 21 44", "M80 5 Q81 25 79 43", "M20 25 Q50 22 80 24", "M21 44 Q50 41 79 43",
            "M50 44 V59", "M6 63 Q50 58 94 60",
            "M24 78 Q50 74 77 77 Q81 96 77 113 Q50 116 24 113 Q20 96 24 78 Z",
            "M126 9 Q125 30 127 52", "M170 7 Q171 30 169 51", "M126 30 Q148 28 170 29", "M127 52 Q148 49 169 51",
            "M212 2 Q214 31 211 62", "M190 21 Q201 19 212 18", "M190 41 Q201 39 212 38",
            "M130 73 Q170 69 209 71 Q211 83 208 94 Q169 93 131 96 Q129 106 131 117 Q190 118 238 106",
        ]
    return d

def latin(font_path, text="BOMBYEOL", size=17.0, track=0.42, wght=520):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    f = TTFont(font_path)
    if "fvar" in f: f = instancer.instantiateVariableFont(f, {"wght": wght})
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm; s = size / upm
    x = 0.0; paths = []
    for ch in text:
        gn = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[gn].draw(TransformPen(pen, (s, 0, 0, -s, x, 0)))
        paths.append(pen.getCommands()); x += gs[gn].width * s + size * track
    return " ".join(paths), x - size * track

def wordmark(style, color, latin_d, latin_w, sw=9.5, gold=True):
    strokes = "".join(f'<path d="{p}"/>' for p in hangul(style))
    out = f'<g fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{strokes}</g>'
    # 영문은 한글 폭(6..214) 가운데 정렬
    lx = 110 - latin_w / 2
    out += f'<path transform="translate({lx:.2f} 150)" d="{latin_d}" fill="{color}"/>'
    if gold and style == "W2":
        out += f'<path d="{spark(236, 18, 9)}" fill="{C["gold"]}"/>'
    return out

def svg(w, h, body, title, bg=None, rx=0):
    b = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{b}{body}</svg>\n')

def main(font):
    ld, lw = latin(font)
    files = {}
    for v in ("S1", "S2", "S3"):
        files[f"symbol-{v}.svg"] = svg(100, 100, symbol(v, C["paper"]), f"봄별 심볼 {v}")
        files[f"symbol-{v}-dark.svg"] = svg(100, 100, symbol(v, C["navy"], dark=True), f"봄별 심볼 {v} 어두운 바탕", bg=C["navy"])
        files[f"symbol-{v}-mono.svg"] = svg(100, 100, symbol(v, C["paper"], mono=C["ink"]), f"봄별 심볼 {v} 단색")
        files[f"symbol-{v}-small.svg"] = svg(100, 100, symbol(v, C["paper"], small=True), f"봄별 심볼 {v} 작은 크기")
        # 앱 아이콘(마스커블 안전 영역 80% 안에 심볼)
        files[f"icon-{v}.svg"] = svg(100, 100, f'<g transform="translate(7 7) scale(.86)">{symbol(v, C["paper"], small=True)}</g>', f"봄별 앱 아이콘 {v}", bg=C["paper"], rx=0)
        files[f"icon-{v}-dark.svg"] = svg(100, 100, f'<g transform="translate(7 7) scale(.86)">{symbol(v, C["navy"], dark=True, small=True)}</g>', f"봄별 앱 아이콘 {v} 어두운", bg=C["navy"], rx=0)
    for w in ("W1", "W2"):
        files[f"wordmark-{w}.svg"] = svg(252, 162, wordmark(w, C["navy"], ld, lw), f"봄별 워드마크 {w}")
        files[f"wordmark-{w}-dark.svg"] = svg(252, 162, wordmark(w, C["paper"], ld, lw), f"봄별 워드마크 {w} 어두운 바탕", bg=C["navy"])
        for v in ("S1", "S2"):
            body = f'<g transform="translate(0 6) scale(1.5)">{symbol(v, C["paper"])}</g><g transform="translate(176 8)">{wordmark(w, C["navy"], ld, lw)}</g>'
            files[f"lockup-{v}-{w}.svg"] = svg(440, 172, body, f"봄별 로고 {v}+{w}")
    for n, s in files.items():
        (OUT / n).write_text(s, encoding="utf-8")
    print(len(files), "files")

if __name__ == "__main__":
    main(sys.argv[1])
