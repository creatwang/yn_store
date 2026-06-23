// @ts-nocheck
import { Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  DraftOrderRecord,
  useConvertDraftOrder,
} from "../../../../hooks/api/draft-orders"
import { getStylizedAmount } from "../../../../lib/money/money-amount-helpers"

type DraftOrderSummarySectionProps = {
  draftOrder: DraftOrderRecord
}

export const DraftOrderSummarySection = ({
  draftOrder,
}: DraftOrderSummarySectionProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const { mutateAsync: convertDraft, isPending } = useConvertDraftOrder(
    draftOrder.id,
  )

  const items = draftOrder.items ?? []
  const shippingMethods = draftOrder.draft_shipping_methods ?? []

  const itemsSubtotal = items.reduce((sum, item) => {
    const price = item.unit_price ?? 0
    return sum + price * item.quantity
  }, 0)

  const shippingTotal = shippingMethods.reduce(
    (sum, method) => sum + (method.amount ?? 0),
    0,
  )

  const handleConvert = async () => {
    if (items.length === 0) {
      toast.error(t("draftOrders.validation.requiredItems"))
      return
    }

    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("draftOrders.create.createDraftOrderHint"),
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    })

    if (!confirmed) {
      return
    }

    try {
      const { order } = await convertDraft()
      toast.success(t("orders.domain"))
      navigate(`/orders/${order.id}`)
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{t("fields.summary")}</Heading>
        <Button
          size="small"
          isLoading={isPending}
          onClick={handleConvert}
        >
          {t("actions.continue")}
        </Button>
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
              className="flex justify-between text-sm"
            >
              <span>
                {item.title || item.variant_id} × {item.quantity}
              </span>
              {item.unit_price != null && (
                <span>
                  {getStylizedAmount(
                    item.unit_price * item.quantity,
                    draftOrder.currency_code ?? "USD",
                  )}
                </span>
              )}
            </div>
          ))
        )}
        <div className="border-ui-border-base mt-2 flex flex-col gap-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <Text>{t("orders.summary.itemSubtotal")}</Text>
            <Text>
              {getStylizedAmount(
                itemsSubtotal,
                draftOrder.currency_code ?? "USD",
              )}
            </Text>
          </div>
          <div className="flex justify-between">
            <Text>{t("orders.summary.shippingTotal")}</Text>
            <Text>
              {getStylizedAmount(
                shippingTotal,
                draftOrder.currency_code ?? "USD",
              )}
            </Text>
          </div>
        </div>
      </div>
    </Container>
  )
}
