// @ts-nocheck
import {
  Button,
  Container,
  CurrencyInput,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import {
  StackedFocusModal,
  useStackedModal,
} from "../../../../components/modals"
import {
  DraftOrderItemRecord,
  DraftOrderRecord,
  useAddDraftOrderItems,
  useRemoveDraftOrderItem,
} from "../../../../hooks/api/draft-orders"
import { AddOrderEditItemsTable } from "../../../orders/order-create-edit/components/add-order-edit-items-table"

type DraftOrderItemsSectionProps = {
  draftOrder: DraftOrderRecord
}

let selectedVariantIds: string[] = []

export const DraftOrderItemsSection = ({
  draftOrder,
}: DraftOrderItemsSectionProps) => {
  const { t } = useTranslation()
  const { setIsOpen } = useStackedModal()
  const items = draftOrder.items ?? []

  const { mutateAsync: addItems, isPending: isAdding } = useAddDraftOrderItems(
    draftOrder.id,
  )
  const { mutateAsync: removeItem, isPending: isRemoving } =
    useRemoveDraftOrderItem(draftOrder.id)

  const [customTitle, setCustomTitle] = useState("")
  const [customQty, setCustomQty] = useState("1")
  const [customPrice, setCustomPrice] = useState<{
    value: string
    float: number | null
  }>({ value: "", float: null })

  const onVariantsSelected = async () => {
    if (selectedVariantIds.length === 0) {
      return
    }

    try {
      await addItems({
        items: selectedVariantIds.map((variant_id) => ({
          variant_id,
          quantity: 1,
        })),
      })
      selectedVariantIds = []
      setIsOpen("draft-add-items", false)
      toast.success(t("actions.addItems"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  const onAddCustomItem = async () => {
    const qty = Number(customQty)
    if (!customTitle.trim() || !Number.isFinite(qty) || qty < 1) {
      toast.error(t("draftOrders.validation.requiredItems"))
      return
    }

    try {
      await addItems({
        items: [
          {
            title: customTitle.trim(),
            quantity: qty,
            unit_price: customPrice.float ?? undefined,
          },
        ],
      })
      setCustomTitle("")
      setCustomQty("1")
      setCustomPrice({ value: "", float: null })
      toast.success(t("actions.addItems"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  const onRemove = async (item: DraftOrderItemRecord) => {
    if (!item.edit_action_id) {
      toast.error(t("errors.serverError"))
      return
    }

    try {
      await removeItem(item.edit_action_id)
      toast.success(t("actions.delete"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <Heading level="h2">{t("fields.items")}</Heading>
        <div className="flex flex-wrap gap-2">
          <StackedFocusModal id="draft-add-items">
            <StackedFocusModal.Trigger asChild>
              <Button
                size="small"
                variant="secondary"
                disabled={!draftOrder.region_id}
              >
                {t("draftOrders.create.addExistingItemsAction")}
              </Button>
            </StackedFocusModal.Trigger>
            <StackedFocusModal.Content>
              <StackedFocusModal.Header />
              <AddOrderEditItemsTable
                currencyCode={draftOrder.currency_code ?? "USD"}
                onSelectionChange={(ids) => {
                  selectedVariantIds = ids
                }}
              />
              <StackedFocusModal.Footer>
                <Button
                  size="small"
                  onClick={onVariantsSelected}
                  isLoading={isAdding}
                >
                  {t("actions.add")}
                </Button>
              </StackedFocusModal.Footer>
            </StackedFocusModal.Content>
          </StackedFocusModal>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        {items.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted">
            {t("draftOrders.create.noExistingItemsAddedLabel")}
          </Text>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2"
            >
              <div className="text-sm">
                <div>{item.title || item.variant_id}</div>
                <Text size="small" className="text-ui-fg-subtle">
                  × {item.quantity}
                </Text>
              </div>
              <Button
                size="small"
                variant="transparent"
                isLoading={isRemoving}
                onClick={() => onRemove(item)}
              >
                {t("actions.remove")}
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        <Heading level="h3">{t("draftOrders.create.customItemsLabel")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("draftOrders.create.customItemsHint")}
        </Text>
        <div className="grid max-w-md gap-3">
          <div>
            <Label>{t("fields.title")}</Label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("fields.quantity")}</Label>
            <Input
              type="number"
              min={1}
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("draftOrders.create.unitPriceOverrideLabel")}</Label>
            <CurrencyInput
              value={customPrice.value}
              onValueChange={(_value, _name, values) =>
                setCustomPrice({
                  value: values?.value ?? "",
                  float: values?.float ?? null,
                })
              }
              symbol={
                draftOrder.currency_code === "EUR"
                  ? "€"
                  : draftOrder.currency_code === "CNY"
                    ? "¥"
                    : "$"
              }
            />
          </div>
          <Button
            size="small"
            variant="secondary"
            isLoading={isAdding}
            onClick={onAddCustomItem}
          >
            {t("draftOrders.create.addCustomItemAction")}
          </Button>
        </div>
      </div>
    </Container>
  )
}
