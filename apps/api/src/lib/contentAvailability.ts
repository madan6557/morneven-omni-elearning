export const CONTENT_AVAILABILITY = ["ARCHIVED", "NOT_OPEN_MANUALLY", "NOT_STARTED", "ACCESS_ENDED", "AVAILABLE"] as const;
export type ContentAvailability = (typeof CONTENT_AVAILABILITY)[number];

export type ContentSchedule = {
  id: string;
  moduleId?: string | null;
  title: string;
  archived?: boolean;
  isOpen?: boolean;
  availableFrom?: Date | string | null;
  availableUntil?: Date | string | null;
};

export function getContentAvailability(item: ContentSchedule, now = new Date()): ContentAvailability {
  if (item.archived) return "ARCHIVED";
  if (item.isOpen === false) return "NOT_OPEN_MANUALLY";
  if (item.availableFrom && new Date(item.availableFrom) > now) return "NOT_STARTED";
  if (item.availableUntil && new Date(item.availableUntil) <= now) return "ACCESS_ENDED";
  return "AVAILABLE";
}

export function isContentAvailable(item: ContentSchedule, now = new Date()) {
  return getContentAvailability(item, now) === "AVAILABLE";
}

export function contentPreview(item: ContentSchedule, type: string, now = new Date()) {
  const availability = getContentAvailability(item, now);
  return {
    id: item.id,
    title: item.title,
    type,
    moduleId: item.moduleId ?? null,
    availability,
    availableFrom: item.availableFrom || null,
    availableUntil: item.availableUntil || null,
  };
}

export function unavailableContent(res: any, item: ContentSchedule, type: string, now = new Date()) {
  const availability = getContentAvailability(item, now);
  const message = availability === "NOT_STARTED"
    ? "Konten belum tersedia sesuai jadwal."
    : availability === "ACCESS_ENDED"
      ? "Akses konten telah berakhir."
      : "Konten sedang ditutup oleh pengelola.";
  return res.status(403).json({ code: "CONTENT_NOT_AVAILABLE", message, availability, preview: contentPreview(item, type, now) });
}

export function assertDateOrder(start: Date | null, end: Date | null) {
  return !start || !end || end >= start;
}
