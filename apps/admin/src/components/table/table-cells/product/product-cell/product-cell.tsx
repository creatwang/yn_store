import { useTranslation } from "react-i18next"

import { Thumbnail } from "../../../../common/thumbnail"
import { HttpTypes } from "@medusajs/types"

type ProductCellProps = {
  product?: Pick<HttpTypes.AdminProduct, "thumbnail" | "title"> | null
  fallbackTitle?: string | null
  fallbackThumbnail?: string | null
}

const resolveDisplay = ({
  product,
  fallbackTitle,
  fallbackThumbnail,
}: ProductCellProps) => {
  if (product != null) {
    return {
      title: product.title ?? fallbackTitle ?? "-",
      thumbnail: product.thumbnail ?? fallbackThumbnail ?? undefined,
    }
  }

  return {
    title: fallbackTitle ?? "-",
    thumbnail: fallbackThumbnail ?? undefined,
  }
}

export const ProductCell = (props: ProductCellProps) => {
  const { title, thumbnail } = resolveDisplay(props)

  return (
    <div className="flex h-full w-full max-w-[250px] items-center gap-x-3 overflow-hidden">
      <div className="w-fit flex-shrink-0">
        <Thumbnail src={thumbnail} />
      </div>
      <span title={title} className="truncate">
        {title}
      </span>
    </div>
  )
}

export const ProductHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.product")}</span>
    </div>
  )
}
