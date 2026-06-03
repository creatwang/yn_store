// @ts-nocheck
import { Hint, Input, Label } from "@medusajs/ui"
import { Control } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../components/common/form"
import { CountrySelect } from "../../../components/inputs/country-select"

type DraftOrderShippingAddressFieldsProps = {
  control: Control<any>
  namePrefix?: string
}

export const DraftOrderShippingAddressFields = ({
  control,
  namePrefix = "shipping_address",
}: DraftOrderShippingAddressFieldsProps) => {
  const { t } = useTranslation()

  const field = (suffix: string) => `${namePrefix}.${suffix}`

  return (
    <div className="grid grid-cols-2 gap-x-3">
      <div className="flex flex-col gap-y-1">
        <Label size="small" weight="plus">
          {t("addresses.shippingAddress.header")}
        </Label>
        <Hint>{t("addresses.shippingAddress.label")}</Hint>
      </div>
      <div className="flex flex-col gap-y-3">
        <Form.Field
          control={control}
          name={field("country_code")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label variant="subtle">{t("fields.country")}</Form.Label>
              <Form.Control>
                <CountrySelect {...f} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Form.Field
            control={control}
            name={field("first_name")}
            render={({ field: f }) => (
              <Form.Item>
                <Form.Label variant="subtle">{t("fields.firstName")}</Form.Label>
                <Form.Control>
                  <Input {...f} value={f.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={control}
            name={field("last_name")}
            render={({ field: f }) => (
              <Form.Item>
                <Form.Label variant="subtle">{t("fields.lastName")}</Form.Label>
                <Form.Control>
                  <Input {...f} value={f.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>
        <Form.Field
          control={control}
          name={field("company")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label optional variant="subtle">
                {t("fields.company")}
              </Form.Label>
              <Form.Control>
                <Input {...f} value={f.value ?? ""} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={control}
          name={field("address_1")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label variant="subtle">{t("fields.address")}</Form.Label>
              <Form.Control>
                <Input {...f} value={f.value ?? ""} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={control}
          name={field("address_2")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label optional variant="subtle">
                {t("fields.address2")}
              </Form.Label>
              <Form.Control>
                <Input {...f} value={f.value ?? ""} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <Form.Field
            control={control}
            name={field("postal_code")}
            render={({ field: f }) => (
              <Form.Item>
                <Form.Label variant="subtle">
                  {t("fields.postalCode")}
                </Form.Label>
                <Form.Control>
                  <Input {...f} value={f.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={control}
            name={field("city")}
            render={({ field: f }) => (
              <Form.Item>
                <Form.Label variant="subtle">{t("fields.city")}</Form.Label>
                <Form.Control>
                  <Input {...f} value={f.value ?? ""} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>
        <Form.Field
          control={control}
          name={field("province")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label optional variant="subtle">
                {t("fields.province")}
              </Form.Label>
              <Form.Control>
                <Input {...f} value={f.value ?? ""} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
        <Form.Field
          control={control}
          name={field("phone")}
          render={({ field: f }) => (
            <Form.Item>
              <Form.Label optional variant="subtle">
                {t("fields.phone")}
              </Form.Label>
              <Form.Control>
                <Input {...f} value={f.value ?? ""} />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
    </div>
  )
}
