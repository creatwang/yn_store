import { Photo } from "@medusajs/icons"
import { clx } from "@medusajs/ui"

type ThumbnailProps = {
  src?: string | null
  /** Medusa dashboard 兼容别名 */
  thumbnail?: string | null
  alt?: string
  size?: "small" | "base"
}

export const Thumbnail = ({
  src,
  thumbnail,
  alt,
  size = "base",
}: ThumbnailProps) => {
  const imageSrc = src ?? thumbnail
  return (
    <div
      className={clx(
        "bg-ui-bg-component border-ui-border-base flex items-center justify-center overflow-hidden rounded border",
        {
          "h-8 w-6": size === "base",
          "h-5 w-4": size === "small",
        }
      )}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <Photo className="text-ui-fg-subtle" />
      )}
    </div>
  )
}
