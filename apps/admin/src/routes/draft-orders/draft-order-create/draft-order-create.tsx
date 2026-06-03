// @ts-nocheck
import { RouteFocusModal } from "../../../components/modals"
import { CreateDraftOrderForm } from "./components/create-draft-order-form"

export const DraftOrderCreate = () => {
  return (
    <RouteFocusModal>
      <CreateDraftOrderForm />
    </RouteFocusModal>
  )
}
