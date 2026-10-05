import type { ReactNode } from "react";
import { parseLegal, type Inline } from "@/lib/legal-md";

function Text({ parts }: { parts: Inline }) {
  return (
    <>
      {parts.map((p, i) =>
        p.bold ? (
          <b key={i} className="font-bold">
            {p.text}
          </b>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/**
 * 약관, 처리방침 본문. 표는 좁은 화면에서 가로로 넘기되(표 안에서만) 페이지는 넘치지 않는다(WCAG 1.4.10).
 * 하위 항목은 줄을 바꿔 보여준다(whitespace-pre-line).
 */
export function LegalDoc({ markdown, notice }: { markdown: string; notice?: ReactNode }) {
  const blocks = parseLegal(markdown);
  return (
    <article className="flex flex-col gap-4 pb-12">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <div key={i} className="flex flex-col gap-3">
                <h1 id={b.id} className="text-title font-heavy">
                  {b.text}
                </h1>
                {notice}
              </div>
            );
          case "h2":
            return (
              <h2 key={i} id={b.id} className="mt-4 text-title-s font-heavy">
                {b.text}
              </h2>
            );
          case "p":
            return (
              <p key={i}>
                <Text parts={b.text} />
              </p>
            );
          case "ul":
          case "ol": {
            const List = b.type === "ol" ? "ol" : "ul";
            return (
              <List
                key={i}
                className={
                  b.type === "ol" ? "flex list-decimal flex-col gap-2 pl-6" : "flex flex-col gap-2"
                }
              >
                {b.items.map((item, j) => (
                  <li key={j} className="whitespace-pre-line">
                    <Text parts={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "table":
            return (
              <div
                key={i}
                className="overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label={b.head.map((h) => h.map((p) => p.text).join("")).join(", ")}
              >
                <table className="w-full min-w-xl border-collapse text-caption">
                  <thead>
                    <tr>
                      {b.head.map((h, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="border-b-(length:--bw) border-line-strong p-2 text-left font-bold"
                        >
                          <Text parts={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((c, j) => (
                          <td
                            key={j}
                            className="border-b-(length:--bw-hair) border-line p-2 align-top"
                          >
                            <Text parts={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </article>
  );
}
