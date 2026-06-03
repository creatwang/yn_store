// @ts-nocheck
import { Trash } from "@medusajs/icons"
import { Button, Heading, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { TwoColumnPage } from "../../../components/layout/pages"
import { StackedModalProvider } from "../../../components/modals/stacked-modal-provider"
import { useExtension } from "../../../providers/extension-provider"
import {
  useDeleteDraftOrder,
  useDraftOrder,
} from "../../../hooks/api/draft-orders"
import { DraftOrderCustomerSection } from "./components/draft-order-customer-section"
import { DraftOrderItemsSection } from "./components/draft-order-items-section"
import { DraftOrderShippingSection } from "./components/draft-order-shipping-section"
import { DraftOrderSummarySection } from "./components/draft-order-summary-section"

export const DraftOrderDetail = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = usePrompt()

  const { getWidgets } = useExtension()
  const { draft_order, isLoading, isError, error } = useDraftOrder(id!)
  const { mutateAsync: deleteDraft, isPending: isDeleting } =
    useDeleteDraftOrder()

  if (isError) {
    throw error
  }

  if (isLoading || !draft_order) {
    return null
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("general.areYouSure"),
      description: t("draftOrders.deleteWarning", { id: draft_order.id }),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
      variant: "danger",
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteDraft(id!)
      toast.success(t("actions.delete"))
      navigate("/draft-orders")
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  }

  return (
    <StackedModalProvider>
      <TwoColumnPage
        widgets={{
          before: getWidgets("draft_order.details.before"),
          after: getWidgets("draft_order.details.after"),
          sideBefore: getWidgets("draft_order.details.side.before"),
          sideAfter: getWidgets("draft_order.details.side.after"),
        }}
        data={draft_order}
        showJSON
        showMetadata
        hasOutlet={false}
      >
        <TwoColumnPage.Main>
          <div className="flex items-center justify-between px-6 py-2">
            <Heading>
              {t("draftOrders.domain")} #{draft_order.display_id ?? id}
            </Heading>
            <Button
              size="small"
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              <Trash />
              {t("actions.delete")}
            </Button>
          </div>
          <DraftOrderSummarySection draftOrder={draft_order} />
          <DraftOrderItemsSection draftOrder={draft_order} />
          <DraftOrderShippingSection draftOrder={draft_order} />
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <DraftOrderCustomerSection draftOrder={draft_order} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </StackedModalProvider>
  )
}
