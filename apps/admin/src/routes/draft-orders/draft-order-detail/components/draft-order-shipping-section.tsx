// @ts-nocheck
import {
  Button,
  Container,
  CurrencyInput,
  Heading,
  Text,
  toast,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Combobox } from "../../../../components/inputs/combobox"
import {
  StackedFocusModal,
  useStackedModal,
} from "../../../../components/modals"
import {
  DraftOrderRecord,
  DraftShippingMethodRecord,
  useAddDraftOrderShippingMethod,
  useRemoveDraftOrderShippingMethod,
} from "../../../../hooks/api/draft-orders"
import { useShippingOptions } from "../../../../hooks/api/shipping-options"
import { getStylizedAmount } from "../../../../lib/money/money-amount-helpers"

type DraftOrderShippingSectionProps = {
  draftOrder: DraftOrderRecord
}

export const DraftOrderShippingSection = ({
  draftOrder,
}: DraftOrderShippingSectionProps) => {
  const { t } = useTranslation()
  const { setIsOpen } = useStackedModal()
  const methods = draftOrder.draft_shipping_methods ?? []

  const { shipping_options = [] } = useShippingOptions({
    limit: 200,
    fields: "id,name,*prices",
  })

  const optionMap = useMemo(
    () => new Map(shipping_options.map((o) => [o.id, o.name])),
    [shipping_options],
  )

  const { mutateAsync: addShipping, isPending: isAdding } =
    useAddDraftOrderShippingMethod(draftOrder.id)
  const { mutateAsync: removeShipping, isPending: isRemoving } =
    useRemoveDraftOrderShippingMethod(draftOrder.id)

  const [shippingOptionId, setShippingOptionId] = useState("")
  const [amount, setAmount] = useState<{ value: string; float: number | null }>(
    { value: "", float: null },
  )

  const shippingComboboxOptions = useMemo(
    () =>
      shipping_options.map((o) => ({
        label: o.name,
        value: o.id,
      })),
    [shipping_options],
  )

  const handleAdd = async () => {
    if (!shippingOptionId) {
      toast.error(t("draftOrders.create.shippingOptionHint"))
      return
    }

    try {
      await addShipping({
        shipping_option_id: shippingOptionId,
        amount: amount.float ?? undefined,
      })
      setShippingOptionId("")
      setAmount({ value: "", float: null })
      setIsOpen("draft-add-shipping", false)
      toast.success(t("actions.save"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  const handleRemove = async (method: DraftShippingMethodRecord) => {
    try {
      await removeShipping(method.id)
      toast.success(t("actions.delete"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("fields.shipping")}</Heading>
        <StackedFocusModal id="draft-add-shipping">
          <StackedFocusModal.Trigger asChild>
            <Button size="small" variant="secondary">
              {t("draftOrders.create.addShippingMethodsAction")}
            </Button>
          </StackedFocusModal.Trigger>
          <StackedFocusModal.Content>
            <StackedFocusModal.Header />
            <div className="flex flex-col gap-4 p-6">
              <Text size="small" className="text-ui-fg-subtle">
                {t("draftOrders.create.shippingOptionHint")}
              </Text>
              <Combobox
                options={shippingComboboxOptions}
                value={shippingOptionId}
                onChange={setShippingOptionId}
                placeholder={t("draftOrders.create.shippingOptionLabel")}
              />
              <div>
                <Text size="small" className="mb-2 text-ui-fg-subtle">
                  {t("draftOrders.create.shippingPriceOverrideHint")}
                </Text>
                <CurrencyInput
                  value={amount.value}
                  onValueChange={(_v, _n, values) =>
                    setAmount({
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
            </div>
            <StackedFocusModal.Footer>
              <Button size="small" onClick={handleAdd} isLoading={isAdding}>
                {t("actions.add")}
              </Button>
            </StackedFocusModal.Footer>
          </StackedFocusModal.Content>
        </StackedFocusModal>
      </div>
      <div className="flex flex-col gap-2 px-6 py-4">
        {methods.length === 0 ? (
          <Text size="small" className="text-ui-fg-muted">
            {t("general.select")} {t("fields.shipping")}
          </Text>
        ) : (
          methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2 text-sm"
            >
              <span>
                {optionMap.get(method.shipping_option_id) ??
                  method.shipping_option_id}
                {method.amount != null &&
                  ` · ${getStylizedAmount(method.amount, draftOrder.currency_code ?? "USD")}`}
              </span>
              <Button
                size="small"
                variant="transparent"
                isLoading={isRemoving}
                onClick={() => handleRemove(method)}
              >
                {t("actions.remove")}
              </Button>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}
