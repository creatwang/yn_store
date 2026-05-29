// @ts-nocheck
import { XMarkMini } from "@medusajs/icons"
import { Button, Heading, IconButton, Input, Label } from "@medusajs/ui"
import { useMemo } from "react"
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../components/common/form"
import { Combobox } from "../../../../../components/inputs/combobox"
import { useComboboxData } from "../../../../../hooks/use-combobox-data"
import { sdk } from "../../../../../lib/client"
import { ProductCreateSchemaType } from "../../types"

type ProductCreateInventoryKitFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateInventoryKitForm = ({
  form,
}: ProductCreateInventoryKitFormProps) => {
  const { t } = useTranslation()

  const variants = useWatch({ control: form.control, name: "variants", defaultValue: [] })
  const options = useWatch({ control: form.control, name: "options", defaultValue: [] })

  const kitVariants = useMemo(
    () =>
      variants
        .map((v, i) => ({ ...v, _idx: i }))
        .filter((v) => v.should_create && v.manage_inventory && v.inventory_kit),
    [variants]
  )

  const items = useComboboxData({
    queryKey: ["inventory_items"],
    queryFn: (params) => sdk.admin.inventoryItem.list(params),
    getOptions: (data) =>
      data.inventory_items.map((item) => ({
        label: item.title ?? item.sku ?? item.id,
        value: item.id,
      })),
  })

  if (kitVariants.length === 0) return null

  return (
    <div className="flex flex-col items-center p-16">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8">
        <Heading>{t("products.create.inventory.heading")}</Heading>
        {kitVariants.map((v) => (
          <InventoryKitVariant
            key={v._idx}
            variant={v}
            variantIndex={v._idx}
            form={form}
            items={items}
          />
        ))}
      </div>
    </div>
  )
}

type InventoryKitVariantProps = {
  variant: any
  variantIndex: number
  form: UseFormReturn<ProductCreateSchemaType>
  items: ReturnType<typeof useComboboxData>
}

function InventoryKitVariant({
  variant,
  variantIndex,
  form,
  items,
}: InventoryKitVariantProps) {
  const { t } = useTranslation()
  const inventory = useFieldArray({
    control: form.control,
    name: `variants.${variantIndex}.inventory`,
  })

  const isItemDisabled = (option: { value: string }, idx: number) => {
    return inventory.fields.some(
      (f, i) => i !== idx && f.inventory_item_id === option.value
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col">
          <Label weight="plus">{variant.title || "Variant"}</Label>
          <Form.Hint>{t("products.create.inventory.label")}</Form.Hint>
        </div>
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={() =>
            inventory.append({ inventory_item_id: "", required_quantity: "" })
          }
        >
          {t("actions.add")}
        </Button>
      </div>
      {inventory.fields.map((invItem, invIdx) => (
        <li
          key={invItem.id}
          className="bg-ui-bg-component shadow-elevation-card-rest grid grid-cols-[1fr_28px] items-center gap-1.5 rounded-xl p-1.5"
        >
          <div className="grid grid-cols-[min-content,1fr] items-center gap-1.5">
            <div className="flex items-center px-2 py-1.5">
              <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">
                {t("fields.item")}
              </Label>
            </div>
            <Form.Field
              control={form.control}
              name={`variants.${variantIndex}.inventory.${invIdx}.inventory_item_id`}
              render={({ field }) => (
                <Form.Item>
                  <Form.Control>
                    <Combobox
                      {...field}
                      options={items.options.map((o) => ({
                        ...o,
                        disabled: isItemDisabled(o, invIdx),
                      }))}
                      searchValue={items.searchValue}
                      onSearchValueChange={items.onSearchValueChange}
                      fetchNextPage={items.fetchNextPage}
                      className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
                      placeholder={t("products.create.inventory.itemPlaceholder")}
                    />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <div className="flex items-center px-2 py-1.5">
              <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">
                {t("fields.quantity")}
              </Label>
            </div>
            <Form.Field
              control={form.control}
              name={`variants.${variantIndex}.inventory.${invIdx}.required_quantity`}
              render={({ field: { value, onChange, ...field } }) => (
                <Form.Item>
                  <Form.Control>
                    <Input
                      type="number"
                      className="bg-ui-bg-field-component"
                      min={0}
                      value={value || ""}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === "") {
                          onChange("")
                        } else {
                          onChange(Number(v))
                        }
                      }}
                      {...field}
                      placeholder={t("products.create.inventory.quantityPlaceholder")}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
          <IconButton
            type="button"
            size="small"
            variant="transparent"
            className="text-ui-fg-muted"
            onClick={() => inventory.remove(invIdx)}
          >
            <XMarkMini />
          </IconButton>
        </li>
      ))}
    </div>
  )
}
