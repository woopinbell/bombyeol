/**
 * 스프링 토큰(DESIGN §11 spring-settle 등)을 CSS linear() 곡선으로 바꾼다. 브라우저가 곡선대로 움직이므로
 * 매 프레임 자바스크립트가 돌지 않는다. 반-암시적 오일러로 적분해 0 → 1 진행을 샘플링하고, 멈춘 시점이 길이가 된다.
 */
export function springCurve(
  { stiffness, damping, mass = 1 }: { stiffness: number; damping: number; mass?: number },
  { step = 1 / 120, maxSeconds = 2, samples = 40 } = {},
): { duration: number; easing: string } {
  const points: number[] = [];
  let x = 0;
  let v = 0;
  let t = 0;
  while (t < maxSeconds) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * step;
    x += v * step;
    t += step;
    points.push(x);
    if (Math.abs(v) < 0.001 && Math.abs(x - 1) < 0.001) break;
  }
  const every = Math.max(1, Math.floor(points.length / samples));
  const picked = points.filter((_, i) => i % every === 0);
  const values = [0, ...picked.map((p) => Math.round(p * 1000) / 1000), 1];
  return { duration: Math.round(t * 1000), easing: `linear(${values.join(", ")})` };
}
