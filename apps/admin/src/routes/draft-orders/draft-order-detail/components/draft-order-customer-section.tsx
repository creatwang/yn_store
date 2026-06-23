// @ts-nocheck
import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Container, Heading, Input, Switch, Text, toast } from "@medusajs/ui"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../components/common/form"
import { Combobox } from "../../../../components/inputs/combobox"
import { CustomerInfo } from "../../../../components/common/customer-info"
import {
  DraftOrderRecord,
  useUpdateDraftOrder,
} from "../../../../hooks/api/draft-orders"
import { useComboboxData } from "../../../../hooks/use-combobox-data"
import { sdk } from "../../../../lib/api/client"

type DraftOrderCustomerSectionProps = {
  draftOrder: DraftOrderRecord
}

const CustomerSchema = zod.object({
  use_existing_customer: zod.boolean(),
  customer_id: zod.string().optional(),
  email: zod.string().optional(),
})

export const DraftOrderCustomerSection = ({
  draftOrder,
}: DraftOrderCustomerSectionProps) => {
  const { t } = useTranslation()
  const { mutateAsync, isPending } = useUpdateDraftOrder(draftOrder.id)

  const form = useForm<zod.infer<typeof CustomerSchema>>({
    defaultValues: {
      use_existing_customer: !!draftOrder.customer_id,
      customer_id: (draftOrder.customer_id as string) ?? "",
      email: (draftOrder.email as string) ?? "",
    },
    resolver: zodResolver(CustomerSchema),
  })

  const useExisting = useWatch({
    control: form.control,
    name: "use_existing_customer",
  })

  const customers = useComboboxData({
    queryKey: ["customers", "draft-order", draftOrder.id],
    queryFn: (params) => sdk.admin.customer.list({ ...params, limit: 20 }),
    getOptions: (data) =>
      data.customers.map((item) => ({
        label: `${item.first_name || ""} ${item.last_name || ""} (${item.email})`.trim(),
        value: item.id,
      })),
    defaultValue: draftOrder.customer_id as string | undefined,
    enabled: useExisting,
  })

  const handleSave = form.handleSubmit(async (values) => {
    try {
      await mutateAsync({
        customer_id: values.use_existing_customer
          ? values.customer_id
          : null,
        email: values.use_existing_customer ? undefined : values.email,
      })
      toast.success(t("actions.save"))
    } catch (e) {
      toast.error(e.message ?? t("errors.serverError"))
    }
  })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("fields.customer")}</Heading>
      </div>
      {draftOrder.customer_id ? (
        <CustomerInfo.ID
          data={{
            customer: { id: draftOrder.customer_id },
            email: draftOrder.email,
          }}
        />
      ) : (
        <div className="px-6 pb-4">
          <Text size="small">{draftOrder.email ?? "—"}</Text>
        </div>
      )}
      <Form {...form}>
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 px-6 py-4"
        >
        <Form.Field
          control={form.control}
          name="use_existing_customer"
          render={({ field }) => (
            <Form.Item>
              <div className="flex items-center justify-between">
                <Form.Label>
                  {t("draftOrders.create.useExistingCustomerLabel")}
                </Form.Label>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </Form.Item>
          )}
        />
        {useExisting ? (
          <Form.Field
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("fields.customer")}</Form.Label>
                <Combobox
                  {...customers}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Form.Item>
            )}
          />
        ) : (
          <Form.Field
            control={form.control}
            name="email"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("fields.email")}</Form.Label>
                <Input {...field} type="email" />
              </Form.Item>
            )}
          />
        )}
        <Button
          type="submit"
          size="small"
          variant="secondary"
          isLoading={isPending}
        >
          {t("actions.save")}
        </Button>
        </form>
      </Form>
    </Container>
  )
}
