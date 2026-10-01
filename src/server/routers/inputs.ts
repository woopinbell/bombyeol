import { z } from "zod";

export const spaceName = z.string().trim().min(1).max(40);
export const relationLabel = z.string().trim().min(1).max(20);
export const personName = z.string().trim().min(1).max(30);
/** YYYY-MM-DD → UTC 자정 Date(@db.Date 저장용) */
export const isoDate = z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`));
