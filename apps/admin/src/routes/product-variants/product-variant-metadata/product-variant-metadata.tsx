import { useParams } from "react-router-dom"
import { MetadataForm } from "../../../components/forms/metadata-form/metadata-form"
import {
  useProductVariant,
  useUpdateProductVariant,
} from "../../../hooks/api/products"

export const ProductVariantMetadata = () => {
  const { id: productId, variant_id: variantId } = useParams()

  const { variant, isPending, isError, error } = useProductVariant(
    productId!,
    variantId!,
  )

  const { mutateAsync, isPending: isMutating } = useUpdateProductVariant(
    variant?.product_id!,
    variantId!,
  )

  if (isError) {
    throw error
  }

  return (
    <MetadataForm
      metadata={variant?.metadata}
      hook={mutateAsync}
      isPending={isPending}
      isMutating={isMutating}
    />
  )
}
