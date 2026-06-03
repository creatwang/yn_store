import type { notification as notificationTable } from "@my-store/db"

export type FeedNotificationData = {
  title: string
  description?: string
  file?: {
    filename?: string
    url?: string
    mimeType?: string
  }
}

type NotificationRow = typeof notificationTable.$inferSelect

export function isFeedNotification(row: NotificationRow) {
  return row.channel === "feed"
}

export function parseFeedData(
  data: unknown,
): FeedNotificationData | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const title = d.title
  if (typeof title !== "string" || !title.trim()) return null
  const file = d.file
  let parsedFile: FeedNotificationData["file"]
  if (file && typeof file === "object") {
    const f = file as Record<string, unknown>
    parsedFile = {
      filename:
        typeof f.filename === "string" ? f.filename : undefined,
      url: typeof f.url === "string" ? f.url : undefined,
      mimeType:
        typeof f.mimeType === "string" ? f.mimeType : undefined,
    }
  }
  return {
    title: title.trim(),
    description:
      typeof d.description === "string" ? d.description : undefined,
    file: parsedFile,
  }
}
