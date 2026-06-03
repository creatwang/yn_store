import { ArrowUpRightOnBox } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Badge, Container, Heading, IconButton } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

interface MetadataSectionProps {
  order: HttpTypes.AdminOrder
}

export const MetadataSection = ({ order }: MetadataSectionProps) => {
  const { t } = useTranslation()
  const keyCount = Object.keys(order.metadata || {}).length

  return (
    <Container className="flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        <Heading level="h2">{t("fields.metadata")}</Heading>
        <Badge size="2xsmall" rounded="full">
          {t("draftOrders.detail.metadataKeys", { count: keyCount })}
        </Badge>
      </div>
      <IconButton
        variant="transparent"
        size="small"
        className="text-ui-fg-muted hover:text-ui-fg-subtle"
        asChild
      >
        <Link to="metadata">
          <ArrowUpRightOnBox />
        </Link>
      </IconButton>
    </Container>
  )
}
