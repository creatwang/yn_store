// @ts-nocheck
import i18n from "i18next"

export { DraftOrderCreate as Component } from "./draft-order-create"

export const handle = {
  breadcrumb: () => i18n.t("draftOrders.create.createDraftOrder"),
}
