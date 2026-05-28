// @ts-nocheck
import { Button, ProgressStatus, ProgressTabs, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useRouteModal } from "../../../../../components/modals"
import { useCreateProductVariant } from "../../../../../hooks/api/products"
import { CreateProductVariantSchema } from "./constants"
import { DetailsTab } from "./details-tab"
import { PricingTab } from "./pricing-tab"
import { InventoryKitTab } from "./inventory-kit-tab"

enum Tab {
  DETAILS = "details",
  PRICING = "pricing",
  INVENTORY = "inventory",
}

type ProductCreateVariantFormProps = {
  product: any
}

export const CreateProductVariantForm = ({ product }: ProductCreateVariantFormProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { handleSuccess } = useRouteModal()

  const form = useForm({
    defaultValues: {
      title: "",
      sku: "",
      manage_inventory: true,
      allow_backorder: false,
      variant_rank: 0,
      options: {},
      prices: [],
      inventory_kit: false,
    },
  })
  const { mutateAsync, isPending } = useCreateProductVariant(product.id)

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data, {
      onSuccess: () => {
        toast.success(t("products.variant.create.successToast"))
        handleSuccess()
      },
      onError: (err) => {
        toast.error(err.message || t("products.variant.create.errorToast"))
      },
    })
  })

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <DetailsTab form={form} product={product} />
      </div>
      <div className="flex items-center justify-end gap-x-2 border-t p-4">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          {t("actions.cancel")}
        </Button>
        <Button type="submit" isLoading={isPending}>
          {t("actions.save")}
        </Button>
      </div>
    </form>
  )
}
