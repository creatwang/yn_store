// @ts-nocheck
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Heading,
  Input,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useCreateSalesChannel } from "../../../../../hooks/api/sales-channels"

const CreateSalesChannelSchema = zod.object({
  name: zod.string().min(1),
  description: zod.string().optional(),
  enabled: zod.boolean(),
})

export const CreateSalesChannelForm = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<zod.infer<typeof CreateSalesChannelSchema>>({
    defaultValues: {
      name: "",
      description: "",
      enabled: true,
    },
    resolver: zodResolver(CreateSalesChannelSchema),
  })

  const { mutateAsync, isPending } = useCreateSalesChannel()

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(
      {
        name: values.name,
        description: values.description || undefined,
        is_disabled: !values.enabled,
      },
      {
        onSuccess: ({ sales_channel }) => {
          toast.success(t("salesChannels.toast.create"))
          handleSuccess(`../${sales_channel.id}`)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        className="flex size-full flex-col overflow-hidden"
        onSubmit={handleSubmit}
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 justify-center overflow-auto px-6 py-16">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <div className="flex flex-col gap-y-1">
              <RouteFocusModal.Title asChild>
                <Heading>{t("salesChannels.createSalesChannel")}</Heading>
              </RouteFocusModal.Title>
              <RouteFocusModal.Description asChild>
                <Text size="small" className="text-ui-fg-subtle">
                  {t("salesChannels.createSalesChannelHint")}
                </Text>
              </RouteFocusModal.Description>
            </div>
            <div className="flex flex-col gap-y-4">
              <Form.Field
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.name")}</Form.Label>
                    <Form.Control>
                      <Input {...field} size="small" />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("fields.description")}</Form.Label>
                    <Form.Control>
                      <Textarea {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="enabled"
                render={({ field: { onChange, value, ...field } }) => (
                  <Form.Item>
                    <div className="flex items-center justify-between">
                      <Form.Label>{t("general.enabled")}</Form.Label>
                      <Form.Control>
                        <Switch
                          dir="ltr"
                          className="rtl:rotate-180"
                          onCheckedChange={onChange}
                          checked={value}
                          {...field}
                        />
                      </Form.Control>
                    </div>
                    <Form.Hint>{t("salesChannels.enabledHint")}</Form.Hint>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
