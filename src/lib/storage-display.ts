const MB = 1024 * 1024;
const GB = 1024 * MB;

/** 저장 공간을 화면에 보일 단위로: 1GB 미만은 MB(정수), 그 이상은 GB(소수 한 자리) */
export function bytesForDisplay(bytes: number): {
  value: number;
  unit: "megabyte" | "gigabyte";
  fraction: number;
} {
  if (bytes < GB) return { value: Math.ceil(bytes / MB), unit: "megabyte", fraction: 0 };
  return { value: Math.round((bytes / GB) * 10) / 10, unit: "gigabyte", fraction: 1 };
}

/** 쓴 비율(0~1). 거의 다 찼는지는 90%부터 알린다 */
export function storageRatio(usedBytes: number, limitBytes: number) {
  const ratio = limitBytes > 0 ? Math.min(1, usedBytes / limitBytes) : 1;
  return { ratio, nearFull: ratio >= 0.9 };
}
