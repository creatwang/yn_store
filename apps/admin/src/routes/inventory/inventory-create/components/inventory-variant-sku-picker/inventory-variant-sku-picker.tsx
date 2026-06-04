// @ts-nocheck
import { PlusMini, Spinner } from "@medusajs/icons"
import { AdminProductVariant } from "@medusajs/types"
import {
  Button,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Text,
  toast,
  Tooltip,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Thumbnail } from "../../../../../components/common/thumbnail"
import { useVariants } from "../../../../../hooks/api/product-variants"
import { useDebouncedSearch } from "../../../../../hooks/use-debounced-search"

type InventoryVariantSkuPickerProps = {
  onSelectSku: (sku: string) => void
}

export const InventoryVariantSkuPicker = ({
  onSelectSku,
}: InventoryVariantSkuPickerProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { searchValue, onSearchValueChange, query } = useDebouncedSearch()

  const { variants = [], isPending } = useVariants(
    {
      q: query,
      limit: 20,
      fields: "id,title,sku,*product",
    },
    { enabled: open },
  )

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      onSearchValueChange("")
    }
  }

  const handleSelect = (variant: AdminProductVariant) => {
    const sku = variant.sku?.trim()

    if (!sku) {
      toast.error(
        t("inventory.create.variantWithoutSku", {
          defaultValue: "该变体没有 SKU",
        }),
      )
      return
    }

    onSelectSku(sku)
    handleOpenChange(false)
  }

  const getVariantMeta = (variant: AdminProductVariant) => {
    if (!variant.sku?.trim()) {
      return t("inventory.create.variantWithoutSku", {
        defaultValue: "该变体没有 SKU",
      })
    }

    const skuPart = t("inventory.create.variantRowSku", {
      sku: variant.sku,
      defaultValue: `SKU：${variant.sku}`,
    })

    if (!variant.product?.title) {
      return skuPart
    }

    return t("inventory.create.variantRowMeta", {
      skuPart,
      product: variant.product.title,
      defaultValue: `${skuPart} · ${variant.product.title}`,
    })
  }

  return (
    <>
      <Tooltip
        content={t("inventory.create.pickVariant", {
          defaultValue: "从变体填入 SKU",
        })}
      >
        <IconButton
          type="button"
          size="small"
          variant="primary"
          className="size-8 shrink-0"
          onClick={() => setOpen(true)}
        >
          <PlusMini />
        </IconButton>
      </Tooltip>

      <FocusModal open={open} onOpenChange={handleOpenChange}>
        <FocusModal.Content className="flex max-h-[min(640px,90vh)] flex-col">
          <FocusModal.Header>
            <FocusModal.Title className="sr-only">
              {t("inventory.create.pickVariantTitle", {
                defaultValue: "选择变体",
              })}
            </FocusModal.Title>
            <Heading level="h2">
              {t("inventory.create.pickVariantTitle", {
                defaultValue: "选择变体",
              })}
            </Heading>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-1 flex-col gap-y-4 overflow-hidden p-6">
            <Text size="small" className="text-ui-fg-subtle">
              {t("inventory.create.pickVariantHint", {
                defaultValue:
                  "选择后将把变体 SKU 填入上方输入框，保存后通过 SKU 自动关联变体。",
              })}
            </Text>
            <Input
              size="small"
              value={searchValue}
              onChange={(e) => onSearchValueChange(e.target.value)}
              placeholder={t("filters.searchLabel", {
                defaultValue: "搜索",
              })}
              autoFocus
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isPending ? (
                <div className="flex justify-center py-8">
                  <Spinner className="text-ui-fg-muted animate-spin" />
                </div>
              ) : variants.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("inventory.create.noVariantsFound", {
                    defaultValue: "未找到变体",
                  })}
                </Text>
              ) : (
                <ul className="flex flex-col gap-y-1">
                  {variants.map((variant) => {
                    const displayTitle =
                      variant.title ||
                      variant.product?.title ||
                      variant.id

                    return (
                      <li key={variant.id}>
                        <button
                          type="button"
                          className="hover:bg-ui-bg-component-hover transition-fg flex w-full items-center gap-3 rounded-md px-3 py-2 text-left"
                          onClick={() => handleSelect(variant)}
                          aria-label={t("inventory.create.selectVariantItem", {
                            title: displayTitle,
                            defaultValue: `选择变体 ${displayTitle}`,
                          })}
                        >
                          <Thumbnail
                            src={variant.product?.thumbnail ?? undefined}
                          />
                          <div className="min-w-0 flex-1">
                            <Text
                              size="small"
                              weight="plus"
                              leading="compact"
                            >
                              {displayTitle}
                            </Text>
                            <Text
                              size="xsmall"
                              leading="compact"
                              className="text-ui-fg-subtle truncate"
                            >
                              {getVariantMeta(variant)}
                            </Text>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => handleOpenChange(false)}
            >
              {t("actions.cancel", { defaultValue: "取消" })}
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}
