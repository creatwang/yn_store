// @ts-nocheck
import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { RouteFocusModal } from "../../../components/modals"
import { useSalesChannel } from "../../../hooks/api/sales-channels"
import { AddProductsToSalesChannelForm } from "./components"

export const SalesChannelAddProducts = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const {
    sales_channel,
    isPending: isLoading,
    isError,
    error,
  } = useSalesChannel(id!)

  if (isError) {
    throw error
  }

  return (
    <RouteFocusModal>
      {isLoading || !sales_channel ? (
        <>
          <RouteFocusModal.Header />
          <RouteFocusModal.Body className="flex flex-1 items-center justify-center">
            <RouteFocusModal.Title asChild>
              <Heading className="sr-only">
                {t("salesChannels.addProducts")}
              </Heading>
            </RouteFocusModal.Title>
          </RouteFocusModal.Body>
        </>
      ) : (
        <AddProductsToSalesChannelForm salesChannel={sales_channel} />
      )}
    </RouteFocusModal>
  )
}
