/**
 * 将后端返回的相对路径图片 URL 解析为完整 URL。
 *
 * 后端图片路径格式：
 *   - /uploads/filename.jpg（上传文件）
 *   - /imports/filename.jpg（导入文件）
 * 均为相对于 API 服务器的路径。
 */
const API_BASE =
  (typeof process !== "undefined" ? process.env.PUBLIC_API_URL : undefined) ||
  import.meta.env.PUBLIC_API_URL ||
  "http://localhost:7000"

export function resolveImageUrl(src?: string | null): string | null {
  if (!src) return null
  if (src.startsWith("http://") || src.startsWith("https://")) return src
  if (src.startsWith("/")) return `${API_BASE}${src}`
  return `${API_BASE}/${src}`
}
