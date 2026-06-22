// @ts-nocheck
import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button, toast } from "@medusajs/ui"
import {
  createDataGridHelper,
  createDataGridPriceColumns,
  DataGrid,
} from "../../../../../components/data-grid"
import { useRouteModal } from "../../../../../components/modals"
import {
  ProductCreateOptionSchema,
  ProductCreateVariantSchema,
} from "../../constants"
import { ProductCreateSchemaType } from "../../types"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    || "product"
}

/**
 * 生成 n 位 base36 随机串（36^n 种可能，8位=2.8万亿）。
 * 用时间戳加盐：随机字节 XOR 时间戳字节 → 即使随机数碰撞，不同毫秒产出也不同。
 */
function shortRandomId(length = 8): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
  const ts = Date.now()
  const tsBytes = new Uint8Array(8)
  for (let i = 0; i < 8; i++) {
    tsBytes[i] = (ts >> (i * 8)) & 0xff
  }
  const randBytes = crypto.getRandomValues(new Uint8Array(length))
  let result = ""
  for (let i = 0; i < length; i++) {
    const salted = (randBytes[i] ^ tsBytes[i % 8]) % 36
    result += chars[salted]
  }
  return result
}

type ProductCreateVariantsFormProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  regions: HttpTypes.AdminRegion[]
  store: HttpTypes.AdminStore
  pricePreferences: HttpTypes.AdminPricePreference[]
}

export const ProductCreateVariantsForm = ({
  form,
  regions,
  store,
  pricePreferences,
}: ProductCreateVariantsFormProps) => {
  const { t } = useTranslation()
  const { setCloseOnEscape } = useRouteModal()

  const currencyCodes = useMemo(
    () => store?.supported_currencies?.map((c) => c.currency_code) || [],
    [store]
  )

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  const options = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  const watchedTitle = useWatch({
    control: form.control,
    name: "title",
    defaultValue: "",
  })

  /**
   * NOTE: anything that goes to the datagrid component needs to be memoised otherwise DataGrid will rerender and inputs will loose focus
   */
  const columns = useColumns({
    options,
    currencies: currencyCodes,
    regions,
    pricePreferences,
  })

  const variantData = useMemo(() => {
    const ret: (ProductCreateVariantSchema & { originalIndex: number })[] = []

    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })

    return ret
  }, [variants])

  const handleGenerateSkus = () => {
    const base = slugify(watchedTitle || "product")
    const existingSkus = new Set(
      variants.filter((v) => v.sku).map((v) => v.sku!.toLowerCase()),
    )
    let generated = 0

    variants.forEach((v, i) => {
      if (!v.should_create || v.sku) return

      const optValues = (options ?? [])
        .map((opt) => v.options?.[opt.title])
        .filter(Boolean)
        .map((val) => slugify(val!).replace(/-/g, ""))

      const suffix = optValues.length > 0 ? "-" + optValues.join("-") : ""
      const randomSuffix = shortRandomId(8)
      let sku = `${base}${suffix}-${randomSuffix}`

      // 兜底去重
      let counter = 1
      while (existingSkus.has(sku.toLowerCase())) {
        counter++
        sku = `${base}${suffix}-${randomSuffix}-${counter}`
      }

      existingSkus.add(sku.toLowerCase())
      form.setValue(`variants.${i}.sku`, sku)
      generated++
    })

    if (generated > 0) {
      toast.success(t("products.toasts.generateSkus.success"), {
        description: t("products.toasts.generateSkus.description", {
          generated,
          skipped: variants.filter((v) => v.sku && v.should_create).length,
        }),
      })
    } else {
      toast.info(t("products.toasts.generateSkus.noSkusNeeded"))
    }
  }

  return (
    <div className="flex size-full flex-col divide-y overflow-hidden">
      <DataGrid
        columns={columns}
        data={variantData}
        state={form}
        onEditingChange={(editing) => setCloseOnEscape(!editing)}
        headerContent={
          <div className="ml-2">
            <Button
              size="small"
              variant="secondary"
              type="button"
              onClick={handleGenerateSkus}
            >
              {t("products.generateSkus")}
            </Button>
          </div>
        }
      />
    </div>
  )
}

const columnHelper = createDataGridHelper<
  ProductCreateVariantSchema & { originalIndex: number },
  ProductCreateSchemaType
>()

const useColumns = ({
  options,
  currencies = [],
  regions = [],
  pricePreferences = [],
}: {
  options: ProductCreateOptionSchema[]
  currencies?: string[]
  regions?: HttpTypes.AdminRegion[]
  pricePreferences?: HttpTypes.AdminPricePreference[]
}) => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.column({
        id: "options",
        header: () => (
          <div className="flex size-full items-center overflow-hidden">
            <span className="truncate">
              {options.map((o) => o.title).join(" / ")}
            </span>
          </div>
        ),
        cell: (context) => {
          return (
            <DataGrid.ReadonlyCell context={context}>
              {options
                .map((o) => context.row.original.options[o.title])
                .join(" / ")}
            </DataGrid.ReadonlyCell>
          )
        },
        disableHiding: true,
      }),
      columnHelper.column({
        id: "title",
        name: t("fields.title"),
        header: t("fields.title"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.title`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),
      columnHelper.column({
        id: "sku",
        name: t("fields.sku"),
        header: t("fields.sku"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.sku`,
        type: "text",
        cell: (context) => {
          return <DataGrid.TextCell context={context} />
        },
      }),
      columnHelper.column({
        id: "manage_inventory",
        name: t("fields.managedInventory"),
        header: t("fields.managedInventory"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.manage_inventory`,
        type: "boolean",
        cell: (context) => {
          return <DataGrid.BooleanCell context={context} />
        },
      }),
      columnHelper.column({
        id: "allow_backorder",
        name: t("fields.allowBackorder"),
        header: t("fields.allowBackorder"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.allow_backorder`,
        type: "boolean",
        cell: (context) => {
          return <DataGrid.BooleanCell context={context} />
        },
      }),

      columnHelper.column({
        id: "inventory_kit",
        name: t("fields.inventoryKit"),
        header: t("fields.inventoryKit"),
        field: (context) =>
          `variants.${context.row.original.originalIndex}.inventory_kit`,
        type: "boolean",
        cell: (context) => {
          return (
            <DataGrid.BooleanCell
              context={context}
              disabled={!context.row.original.manage_inventory}
            />
          )
        },
      }),

      ...createDataGridPriceColumns<
        ProductCreateVariantSchema & { originalIndex: number },
        ProductCreateSchemaType
      >({
        currencies,
        regions,
        pricePreferences,
        getFieldName: (context, value) => {
          if (context.column.id?.startsWith("currency_prices")) {
            return `variants.${context.row.original.originalIndex}.prices.${value}`
          }
          return `variants.${context.row.original.originalIndex}.prices.${value}`
        },
        t,
      }),
    ],
    [currencies, regions, options, pricePreferences, t]
  )
}
