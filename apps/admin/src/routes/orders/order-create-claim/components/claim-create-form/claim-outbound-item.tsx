// @ts-nocheck
import { XCircle } from "@medusajs/icons"
import { AdminOrderLineItem, HttpTypes } from "@medusajs/types"
import { Input, Text, toast } from "@medusajs/ui"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { Form } from "../../../../../components/common/form"
import { Thumbnail } from "../../../../../components/common/thumbnail"
import { MoneyAmountCell } from "../../../../../components/table/table-cells/common/money-amount-cell"
import { CreateClaimSchemaType } from "./schema"

type ClaimOutboundItemProps = {
  previewItem: AdminOrderLineItem
  currencyCode: string
  index: number
  maxQuantity?: number

  onRemove: () => void
  onUpdate: (payload: { quantity?: number }) => void

  form: UseFormReturn<CreateClaimSchemaType>
}

function ClaimOutboundItem({
  previewItem,
  currencyCode,
  form,
  onRemove,
  onUpdate,
  index,
  maxQuantity,
}: ClaimOutboundItemProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-ui-bg-subtle shadow-elevation-card-rest my-2 rounded-xl ">
      <div className="flex flex-col items-center gap-x-2 gap-y-2 border-b p-3 text-sm md:flex-row">
        <div className="flex flex-1 items-center gap-x-3">
          <Thumbnail src={previewItem.thumbnail} />

          <div className="flex flex-col">
            <div>
              <Text className="txt-small" as="span" weight="plus">
                {previewItem.title}{" "}
              </Text>

              {previewItem.variant_sku && (
                <span>({previewItem.variant_sku})</span>
              )}
            </div>
            <Text as="div" className="text-ui-fg-subtle txt-small">
              {previewItem.subtitle}
            </Text>
          </div>
        </div>

        <div className="flex flex-1 justify-between">
          <div className="flex flex-grow items-center gap-2">
            <Form.Field
              control={form.control}
              name={`outbound_items.${index}.quantity`}
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Control>
                      <Input
                        {...field}
                        className="bg-ui-bg-base txt-small w-[67px] rounded-lg"
                        min={1}
                        max={
                          maxQuantity != null && maxQuantity > 0
                            ? maxQuantity
                            : undefined
                        }
                        type="number"
                        onBlur={(e) => {
                          const val = e.target.value
                          const payload = val === "" ? null : Number(val)

                          if (
                            payload != null &&
                            maxQuantity != null &&
                            payload > maxQuantity
                          ) {
                            field.onChange(maxQuantity)
                            toast.error(
                              t("orders.returns.noInventoryLevelDesc"),
                            )
                            onUpdate({ quantity: maxQuantity })
                            return
                          }

                          field.onChange(payload)

                          if (payload) {
                            onUpdate({ quantity: payload })
                          }
                        }}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Text className="txt-small text-ui-fg-subtle">
              {t("fields.qty")}
            </Text>
          </div>

          <div className="text-ui-fg-subtle txt-small mr-2 flex flex-shrink-0">
            <MoneyAmountCell
              currencyCode={currencyCode}
              amount={previewItem.total}
            />
          </div>

          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    label: t("actions.remove"),
                    onClick: onRemove,
                    icon: <XCircle />,
                  },
                ].filter(Boolean),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export { ClaimOutboundItem }
