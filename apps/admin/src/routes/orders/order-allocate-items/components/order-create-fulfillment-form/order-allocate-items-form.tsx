// @ts-nocheck
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import {
  AdminOrder,
  AdminInventoryItem,
  AdminOrderLineItem,
} from "@medusajs/types"
import { Alert, Button, Heading, Input, Select, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"

import { Form } from "../../../../../components/common/form"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { ordersQueryKeys } from "../../../../../hooks/api/orders"
import { useBulkAllocateReservationItems } from "../../../../../hooks/api/reservations"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { queryClient } from "../../../../../lib/query/query-client"
import { AllocateItemsSchema } from "./constants"
import { OrderAllocateItemsItem } from "./order-allocate-items-item"
import { checkInventoryKit } from "./utils"
import { useDocumentDirection } from "../../../../../hooks/use-document-direction"
import { ExtendedVariant } from "../../../../product-variants/product-variant-detail/constants"

/**
 * This extended type is based on expanded fields in packages/admin/dashboard/src/routes/orders/order-allocate-items/order-allocate-items.tsx
 */
export type ExtendedLineItem = AdminOrderLineItem & {
  variant?: ExtendedVariant
}

type OrderAllocateItemsFormProps = {
  order: AdminOrder
}

type AllocateItemsSchemaType = zod.infer<typeof AllocateItemsSchema>

export function OrderAllocateItemsForm({ order }: OrderAllocateItemsFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const direction = useDocumentDirection()
  const [disableSubmit, setDisableSubmit] = useState(false)
  const [filterTerm, setFilterTerm] = useState("")

  const { mutateAsync: bulkAllocateItems, isPending: isMutating } =
    useBulkAllocateReservationItems()

  const itemsToAllocate = useMemo(
    () =>
      (order.items as ExtendedLineItem[]).filter(
        (item) =>
          item.variant?.manage_inventory &&
          item.variant?.inventory?.length &&
          item.quantity - item.detail.fulfilled_quantity > 0
      ),
    [order.items]
  )

  const filteredItems = useMemo(() => {
    return itemsToAllocate.filter(
      (i) =>
        i.variant_title?.toLowerCase().includes(filterTerm) ||
        i.product_title?.toLowerCase().includes(filterTerm)
    )
  }, [itemsToAllocate, filterTerm])

  const noItemsToAllocate = !itemsToAllocate.length

  const form = useForm<AllocateItemsSchemaType>({
    defaultValues: {
      location_id: "",
      quantity: defaultAllocations(itemsToAllocate),
    },
    resolver: zodResolver(AllocateItemsSchema),
  })

  const { stock_locations = [] } = useStockLocations()

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const payload = Object.entries(data.quantity)
        .filter(([key]) => !key.endsWith("-"))
        .map(([key, quantity]) => [...key.split("-"), quantity])

      if (payload.some((d) => d[2] === "")) {
        form.setError("root.quantityNotAllocated", {
          type: "manual",
          message: t("orders.allocateItems.error.quantityNotAllocated"),
        })

        return
      }

      await bulkAllocateItems({
        location_id: data.location_id,
        items: payload.map(([itemId, inventoryId, quantity]) => ({
          line_item_id: itemId as string,
          inventory_item_id: inventoryId as string,
          quantity: Number(quantity),
        })),
      })

      await queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      handleSuccess(`/orders/${order.id}`)
      toast.success(t("orders.allocateItems.toast.created"))
    } catch (e) {
      toast.error(t("general.error"), {
        description:
          e instanceof Error ? e.message : t("errorBoundary.defaultTitle"),
      })
    }
  })

  const onQuantityChange = (
    inventoryItem: AdminInventoryItem,
    lineItem: ExtendedLineItem,
    hasInventoryKit: boolean,
    value: number | null,
    isRoot?: boolean
  ) => {
    let shouldDisableSubmit = false

    const key =
      isRoot && hasInventoryKit
        ? `quantity.${lineItem.id}-`
        : `quantity.${lineItem.id}-${inventoryItem.id}`

    form.setValue(key as keyof AllocateItemsSchemaType, `${value ?? ""}`)

    if (value) {
      const location = inventoryItem.location_levels?.find(
        (l) => l.location_id === selectedLocationId
      )
      if (location) {
        if ((location.available_quantity ?? 0) < value) {
          shouldDisableSubmit = true
        }
      }
    }

    if (hasInventoryKit && !isRoot) {
      // changed subitem in the kit -> we need to set parent to "-"
      form.resetField(`quantity.${lineItem.id}-`, { defaultValue: "" })
    }

    if (hasInventoryKit && isRoot) {
      // changed root -> we need to set items to parent quantity x required_quantity

      const item = itemsToAllocate.find((i) => i.id === lineItem.id)

      item?.variant?.inventory_items?.forEach((ii, ind: number) => {
        const num = value || 0
        const inventory = item.variant?.inventory?.[ind]

        form.setValue(
          `quantity.${lineItem.id}-${inventory?.id}`,
          num * (ii.required_quantity ?? 1)
        )

        if (value) {
          const location = inventory?.location_levels?.find(
            (l) => l.location_id === selectedLocationId
          )
          if (location) {
            if ((location.available_quantity ?? 0) < value) {
              shouldDisableSubmit = true
            }
          }
        }
      })
    }

    form.clearErrors("root.quantityNotAllocated")
    setDisableSubmit(shouldDisableSubmit)
  }

  const selectedLocationId = useWatch({
    name: "location_id",
    control: form.control,
  })

  useEffect(() => {
    if (selectedLocationId) {
      form.setValue("quantity", defaultAllocations(itemsToAllocate))
    }
  }, [selectedLocationId])

  const allocationError =
    form.formState.errors?.root?.quantityNotAllocated?.message

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex h-full w-full flex-col items-center divide-y overflow-y-auto">
          <div className="flex size-full flex-col items-center overflow-auto p-16">
            <div className="flex w-full max-w-[736px] flex-col justify-center px-2 pb-2">
              <div className="flex flex-col gap-8 divide-y divide-dashed">
                <Heading>{t("orders.allocateItems.title")}</Heading>
                {noItemsToAllocate ? (
                  <Alert className="mt-8" variant="warning">
                    <Text size="small" className="text-ui-fg-subtle">
                      {t("orders.allocateItems.noItemsToAllocate")}
                    </Text>
                  </Alert>
                ) : null}
                <div className="flex-1 divide-y divide-dashed pt-8">
                  <Form.Field
                    control={form.control}
                    name="location_id"
                    render={({ field: { onChange, ref, ...field } }) => {
                      return (
                        <Form.Item>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Form.Label>{t("fields.location")}</Form.Label>
                              <Form.Hint>
                                {t("orders.allocateItems.locationDescription")}
                              </Form.Hint>
                            </div>
                            <div className="flex-1">
                              <Form.Control>
                                <Select
                                  dir={direction}
                                  onValueChange={onChange}
                                  {...field}
                                >
                                  <Select.Trigger
                                    className="bg-ui-bg-base"
                                    ref={ref}
                                  >
                                    <Select.Value />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {stock_locations.map((l) => (
                                      <Select.Item key={l.id} value={l.id}>
                                        {l.name}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select>
                              </Form.Control>
                            </div>
                          </div>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />

                  <Form.Item className="mt-8 pt-8">
                    <div className="flex flex-row items-center">
                      <div className="flex-1">
                        <Form.Label>
                          {t("orders.allocateItems.itemsToAllocate")}
                        </Form.Label>
                        <Form.Hint>
                          {t("orders.allocateItems.itemsToAllocateDesc")}
                        </Form.Hint>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={filterTerm}
                          onChange={(e) => setFilterTerm(e.target.value)}
                          placeholder={t("orders.allocateItems.search")}
                          autoComplete="off"
                          type="search"
                        />
                      </div>
                    </div>

                    {allocationError && (
                      <Alert className="mb-4" dismissible variant="error">
                        {allocationError}
                      </Alert>
                    )}

                    <div className="flex flex-col gap-y-1">
                      {filteredItems.map((item) => (
                        <OrderAllocateItemsItem
                          key={item.id}
                          form={form}
                          item={item}
                          locationId={selectedLocationId}
                          onQuantityChange={onQuantityChange}
                        />
                      ))}
                    </div>
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              size="small"
              type="submit"
              isLoading={isMutating}
              disabled={
                noItemsToAllocate || !selectedLocationId || disableSubmit
              }
            >
              {t("orders.allocateItems.action")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}

function defaultAllocations(items: ExtendedLineItem[]) {
  const ret: Record<string, string> = {}

  items.forEach((item) => {
    const hasInventoryKit =
      item.variant?.inventory_items &&
      checkInventoryKit(item as Parameters<typeof checkInventoryKit>[0])

    ret[
      hasInventoryKit
        ? `${item.id}-`
        : `${item.id}-${item.variant?.inventory?.[0].id}`
    ] = ""

    if (hasInventoryKit) {
      item.variant?.inventory?.forEach((i) => {
        ret[`${item.id}-${i.id}`] = ""
      })
    }
  })

  return ret
}
