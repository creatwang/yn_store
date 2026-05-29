// @ts-nocheck
import { Button, Heading, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"

export const ManageVariantInventoryItemsForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { handleSuccess } = useRouteModal()

  return (
    <RouteDrawer>
      <KeyboundForm
        onSubmit={() => handleSuccess()}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <Heading>{t("products.variant.inventory.manageItems")}</Heading>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button type="submit" size="small">
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer>
  )
}
