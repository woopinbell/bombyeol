/**
 * 탭 화면을 불러오는 동안의 자리(DESIGN §9.6): 최종 화면과 같은 배치의 면만, 글자, 반짝이는 줄 없음.
 * 150ms 뒤에 나타난다 - 빨리 오면 깜빡이지 않는다. 화면 읽기 프로그램에는 "불러오는 중"만 알린다.
 */
export function TabSkeleton({ label, kind }: { label: string; kind: "today" | "plain" }) {
  return (
    <main aria-busy="true" className="skeleton-appear flex flex-1 flex-col px-5 pb-6">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div aria-hidden="true" className="flex flex-col">
        <div className="flex min-h-(--touch-elder) items-center pt-2">
          <div className="h-6 w-1/3 rounded-sm bg-line" />
        </div>
        {kind === "today" ? (
          <>
            <div className="mt-2 h-(--touch-elder) rounded-md border-(length:--bw) border-line" />
            <div className="mt-5 mb-3 h-6 w-1/2 rounded-sm bg-line" />
            <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
              <div className="col-span-2 aspect-video bg-line" />
              <div className="aspect-square bg-line" />
              <div className="aspect-square bg-line" />
            </div>
            <div className="mt-3 h-5 w-3/4 rounded-sm bg-line" />
          </>
        ) : (
          <div className="mt-8 h-12 rounded-lg bg-line" />
        )}
      </div>
    </main>
  );
}
