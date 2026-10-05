"use client";

import { readExifDate } from "@/lib/exif-date";
import { MEDIA_CONTENT_TYPES, UPLOAD_PREP } from "@/lib/plan";
import { stripVideoLocation } from "@/lib/video-location";

export type PreparedMedia = {
  kind: "image" | "video";
  original: Blob;
  contentType: string;
  thumbnail: Blob | null;
  /** 미리보기용 썸네일 객체 URL(다 쓰면 revoke). 영상 프레임을 못 그리면 null */
  previewUrl: string | null;
  takenAt: Date | null;
};

export class PrepError extends Error {
  constructor(public reason: "UNSUPPORTED_TYPE" | "DECODE_FAILED") {
    super(reason);
  }
}

const VIDEO_TYPES: readonly string[] = MEDIA_CONTENT_TYPES.video;
const IMAGE_TYPES: readonly string[] = MEDIA_CONTENT_TYPES.image;

function scaledSize(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encodeJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const size = scaledSize(width, height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PrepError("DECODE_FAILED");
  // 투명한 PNG는 JPEG에서 검게 되므로 흰 바탕을 먼저 깐다(사진 처리용 값, UI 색 아님)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PrepError("DECODE_FAILED"))),
      "image/jpeg",
      quality,
    ),
  );
}

async function prepareImage(file: File): Promise<PreparedMedia> {
  const takenAt =
    file.type === "image/jpeg" ? readExifDate(await file.slice(0, 256 * 1024).arrayBuffer()) : null;
  // createImageBitmap은 EXIF 방향을 적용해 그린다(imageOrientation 기본값 from-image)
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new PrepError("DECODE_FAILED");
  });
  try {
    const { width, height } = bitmap;
    const original = await encodeJpeg(
      bitmap,
      width,
      height,
      UPLOAD_PREP.imageMaxEdge,
      UPLOAD_PREP.imageQuality,
    );
    const thumbnail = await encodeJpeg(
      bitmap,
      width,
      height,
      UPLOAD_PREP.thumbnailMaxEdge,
      UPLOAD_PREP.thumbnailQuality,
    );
    return {
      kind: "image",
      original,
      contentType: "image/jpeg",
      thumbnail,
      previewUrl: URL.createObjectURL(thumbnail),
      takenAt,
    };
  } finally {
    bitmap.close();
  }
}

/** 영상은 다시 인코딩하지 않고(위치 정보만 지움), 앞부분 한 프레임을 썸네일로. 못 그리면 썸네일 없이 */
async function videoPoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video"));
    });
    video.currentTime = Math.min(UPLOAD_PREP.videoPosterAt, (video.duration || 1) / 2);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("video"));
    });
    if (!video.videoWidth) return null;
    return await encodeJpeg(
      video,
      video.videoWidth,
      video.videoHeight,
      UPLOAD_PREP.thumbnailMaxEdge,
      UPLOAD_PREP.thumbnailQuality,
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepareVideo(file: File): Promise<PreparedMedia> {
  // 위치 정보 상자만 지운다(다시 인코딩하지 않음, PRIVACY §4). 구조를 못 읽으면 원래 파일 그대로
  const [thumbnail, original] = await Promise.all([
    videoPoster(file),
    stripVideoLocation(file).catch(() => file),
  ]);
  return {
    kind: "video",
    original,
    contentType: file.type,
    thumbnail,
    previewUrl: thumbnail ? URL.createObjectURL(thumbnail) : null,
    takenAt: null,
  };
}

export function prepareMedia(file: File): Promise<PreparedMedia> {
  if (VIDEO_TYPES.includes(file.type)) return prepareVideo(file);
  // HEIC 등은 브라우저가 그릴 수 있으면 JPEG로 바꿔 올린다
  if (IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/")) return prepareImage(file);
  return Promise.reject(new PrepError("UNSUPPORTED_TYPE"));
}

export const ACCEPT = [...MEDIA_CONTENT_TYPES.image, ...MEDIA_CONTENT_TYPES.video].join(",");
