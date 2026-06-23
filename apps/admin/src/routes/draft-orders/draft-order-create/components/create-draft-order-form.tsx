// @ts-nocheck
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  Divider,
  Heading,
  Hint,
  Input,
  Label,
  Switch,
  toast,
} from "@medusajs/ui"
import { Fragment, useCallback } from "react"
import {
  Control,
  useForm,
  UseFormSetValue,
  useWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AddressCard } from "../../../../components/common/address-card"
import { ConditionalTooltip } from "../../../../components/common/conditional-tooltip"
import { CustomerCard } from "../../../../components/common/customer-card"
import { Form } from "../../../../components/common/form"
import { Combobox } from "../../../../components/inputs/combobox"
import { CountrySelect } from "../../../../components/inputs/country-select"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../components/modals"
import { KeyboundForm } from "../../../../components/utilities/keybound-form"
import { useCreateDraftOrder } from "../../../../hooks/api/draft-orders"
import { useCustomer } from "../../../../hooks/api/customers"
import { useComboboxData } from "../../../../hooks/use-combobox-data"
import { getFormattedAddress } from "../../../../lib/addresses/addresses"
import { sdk } from "../../../../lib/api/client"
import { addressSchema } from "../../../../lib/schemas/address"

const initialAddress = {
  country_code: "",
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  phone: "",
  company: "",
}

const createDraftOrderSchema = z
  .object({
    region_id: z.string().min(1),
    sales_channel_id: z.string().min(1),
    customer_id: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    shipping_address_id: z.string().optional(),
    shipping_address: addressSchema,
    billing_address_id: z.string().optional(),
    billing_address: addressSchema.nullable(),
    same_as_shipping: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.customer_id && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "requiredEmailOrCustomer",
        path: ["email"],
      })
    }

    if (!data.shipping_address && !data.shipping_address_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "shippingRequired",
        path: ["shipping_address"],
      })
    }

    if (data.same_as_shipping === false) {
      if (!data.billing_address && !data.billing_address_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "billingRequired",
          path: ["billing_address"],
        })
      }
    }
  })

type CreateDraftOrderFormValues = z.infer<typeof createDraftOrderSchema>

const useValidationMessage = () => {
  const { t } = useTranslation()

  return (key?: string) => {
    if (!key) {
      return undefined
    }

    const map: Record<string, string> = {
      requiredEmailOrCustomer: t(
        "draftOrders.validation.requiredEmailOrCustomer",
      ),
      invalidEmail: t("draftOrders.validation.invalidEmail"),
      shippingRequired: t("draftOrders.validation.shippingRequired"),
      billingRequired: t("draftOrders.validation.billingRequired"),
    }

    return map[key] ?? key
  }
}

export const CreateDraftOrderForm = () => {
  const { t } = useTranslation()
  const validationMessage = useValidationMessage()
  const { handleSuccess } = useRouteModal()
  const { mutateAsync, isPending } = useCreateDraftOrder()

  const form = useForm<CreateDraftOrderFormValues>({
    defaultValues: {
      region_id: "",
      sales_channel_id: "",
      customer_id: "",
      email: "",
      shipping_address_id: "",
      shipping_address: initialAddress,
      billing_address_id: "",
      billing_address: null,
      same_as_shipping: true,
    },
    resolver: zodResolver(createDraftOrderSchema),
  })

  const regions = useComboboxData({
    queryFn: (params) => sdk.admin.region.list(params),
    queryKey: ["regions", "draft-order-create"],
    getOptions: (data) =>
      data.regions.map((region) => ({
        label: region.name,
        value: region.id,
      })),
  })

  const salesChannels = useComboboxData({
    queryFn: (params) => sdk.admin.salesChannel.list(params),
    queryKey: ["sales-channels", "draft-order-create"],
    getOptions: (data) =>
      data.sales_channels.map((salesChannel) => ({
        label: salesChannel.name,
        value: salesChannel.id,
      })),
  })

  const handleSubmit = form.handleSubmit(
    async (data) => {
      const billingAddress = data.same_as_shipping
        ? data.shipping_address
        : data.billing_address

      try {
        const { draft_order } = await mutateAsync({
          region_id: data.region_id,
          sales_channel_id: data.sales_channel_id,
          customer_id: data.customer_id || undefined,
          email: !data.customer_id ? data.email : undefined,
          shipping_address: data.shipping_address,
          billing_address: billingAddress!,
        })
        toast.success(t("draftOrders.create.createDraftOrder"))
        handleSuccess(`/draft-orders/${draft_order.id}`)
      } catch (e) {
        toast.error(e.message ?? t("errors.serverError"))
      }
    },
    () => {
      toast.error(t("draftOrders.validation.formInvalid"))
    },
  )

  if (regions.isError) {
    throw regions.error
  }

  if (salesChannels.isError) {
    throw salesChannels.error
  }

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        className="flex h-full flex-col overflow-hidden"
        onSubmit={handleSubmit}
      >
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col items-center overflow-y-auto">
            <div className="flex w-full max-w-[720px] flex-col gap-y-6 px-2 py-16">
              <div>
                <RouteFocusModal.Title asChild>
                  <Heading>
                    {t("draftOrders.create.createDraftOrder")}
                  </Heading>
                </RouteFocusModal.Title>
                <RouteFocusModal.Description asChild>
                  <span className="text-ui-fg-subtle txt-compact-small">
                    {t("draftOrders.create.createDraftOrderHint")}
                  </span>
                </RouteFocusModal.Description>
              </div>
              <Divider variant="dashed" />
              <div>
                <Form.Field
                  control={form.control}
                  name="region_id"
                  render={({ field }) => (
                    <Form.Item>
                      <div className="grid grid-cols-2 gap-x-3">
                        <div>
                          <Form.Label>{t("fields.region")}</Form.Label>
                          <Form.Hint>
                            {t("draftOrders.create.chooseRegionHint")}
                          </Form.Hint>
                        </div>
                        <div>
                          <Form.Control>
                            <Combobox
                              options={regions.options}
                              fetchNextPage={regions.fetchNextPage}
                              isFetchingNextPage={
                                regions.isFetchingNextPage
                              }
                              searchValue={regions.searchValue}
                              onSearchValueChange={
                                regions.onSearchValueChange
                              }
                              placeholder={t(
                                "draftOrders.create.chooseRegionHint",
                              )}
                              {...field}
                              autoComplete="off"
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </div>
                      </div>
                    </Form.Item>
                  )}
                />
              </div>
              <Divider variant="dashed" />
              <div>
                <Form.Field
                  control={form.control}
                  name="sales_channel_id"
                  render={({ field }) => (
                    <Form.Item>
                      <div className="grid grid-cols-2 gap-x-3">
                        <div>
                          <Form.Label>{t("fields.salesChannel")}</Form.Label>
                          <Form.Hint>
                            {t("draftOrders.create.chooseSalesChannelHint")}
                          </Form.Hint>
                        </div>
                        <div>
                          <Form.Control>
                            <Combobox
                              options={salesChannels.options}
                              fetchNextPage={salesChannels.fetchNextPage}
                              isFetchingNextPage={
                                salesChannels.isFetchingNextPage
                              }
                              searchValue={salesChannels.searchValue}
                              onSearchValueChange={
                                salesChannels.onSearchValueChange
                              }
                              placeholder={t(
                                "draftOrders.create.chooseSalesChannelHint",
                              )}
                              {...field}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </div>
                      </div>
                    </Form.Item>
                  )}
                />
              </div>
              <Divider variant="dashed" />
              <CustomerField
                control={form.control}
                setValue={form.setValue}
              />
              <Divider variant="dashed" />
              <EmailField control={form.control} />
              <Divider variant="dashed" />
              <AddressField
                type="shipping_address"
                control={form.control}
                setValue={form.setValue}
              />
              <Divider variant="dashed" />
              <AddressField
                type="billing_address"
                control={form.control}
                setValue={form.setValue}
              />
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
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

interface EmailFieldProps {
  control: Control<CreateDraftOrderFormValues>
}

const EmailField = ({ control }: EmailFieldProps) => {
  const { t } = useTranslation()
  const validationMessage = useValidationMessage()
  const customerId = useWatch({ control, name: "customer_id" })

  return (
    <Form.Field
      control={control}
      name="email"
      render={({ field, fieldState }) => (
        <Form.Item>
          <div className="grid grid-cols-2 gap-x-3">
            <div>
              <Form.Label>{t("fields.email")}</Form.Label>
              <Form.Hint>
                {t("draftOrders.create.emailOrderHint")}
              </Form.Hint>
            </div>
            <ConditionalTooltip
              content={t("draftOrders.create.customerEmailDisabledHint")}
              showTooltip={!!customerId}
            >
              <div>
                <Form.Control>
                  <Input
                    {...field}
                    placeholder="john@doe.com"
                    disabled={field.disabled || !!customerId}
                  />
                </Form.Control>
                <Form.ErrorMessage>
                  {fieldState.error?.message
                    ? validationMessage(fieldState.error.message)
                    : undefined}
                </Form.ErrorMessage>
              </div>
            </ConditionalTooltip>
          </div>
        </Form.Item>
      )}
    />
  )
}

interface CustomerFieldProps {
  control: Control<CreateDraftOrderFormValues>
  setValue: UseFormSetValue<CreateDraftOrderFormValues>
}

const CustomerField = ({ control, setValue }: CustomerFieldProps) => {
  const { t } = useTranslation()
  const customerId = useWatch({ control, name: "customer_id" })

  const customers = useComboboxData({
    queryFn: (params) => sdk.admin.customer.list(params),
    queryKey: ["customers", "draft-order-create"],
    getOptions: (data) =>
      data.customers.map((customer) => {
        const name = [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ")

        return {
          label: name
            ? `${name} (${customer.email})`
            : (customer.email ?? customer.id),
          value: customer.id,
        }
      }),
  })

  const onPropagateEmail = useCallback(
    (value?: string) => {
      const label = customers.options.find(
        (option) => option.value === value,
      )?.label

      const customerEmail =
        label?.match(/\((.*@.*)\)$/)?.[1] || label || ""

      setValue("email", customerEmail, {
        shouldDirty: true,
        shouldTouch: true,
      })
    },
    [customers.options, setValue],
  )

  if (customers.isError) {
    throw customers.error
  }

  return (
    <Form.Field
      control={control}
      name="customer_id"
      render={({ field: { onChange, ...field } }) => {
        const onRemove = () => {
          onChange("")
          setValue("shipping_address_id", "")
          setValue("billing_address_id", "")
        }

        return (
          <Form.Item>
            <div className="grid grid-cols-2 gap-x-3">
              <div>
                <Form.Label optional>{t("fields.customer")}</Form.Label>
                <Form.Hint>
                  {t("draftOrders.create.useExistingCustomerLabel")}
                </Form.Hint>
              </div>
              <Form.Control>
                {customerId ? (
                  <CustomerCard
                    customerId={customerId}
                    onRemove={onRemove}
                  />
                ) : (
                  <Combobox
                    options={customers.options}
                    fetchNextPage={customers.fetchNextPage}
                    isFetchingNextPage={customers.isFetchingNextPage}
                    searchValue={customers.searchValue}
                    onSearchValueChange={customers.onSearchValueChange}
                    placeholder={t("fields.customer")}
                    onChange={(value) => {
                      onPropagateEmail(value)
                      onChange(value)
                    }}
                    {...field}
                  />
                )}
              </Form.Control>
            </div>
          </Form.Item>
        )
      }}
    />
  )
}

interface AddressFieldProps {
  type: "shipping_address" | "billing_address"
  control: Control<CreateDraftOrderFormValues>
  setValue: UseFormSetValue<CreateDraftOrderFormValues>
}

const AddressField = ({ type, control, setValue }: AddressFieldProps) => {
  const { t } = useTranslation()
  const customerId = useWatch({ control, name: "customer_id" })
  const addressId = useWatch({ control, name: `${type}_id` })
  const sameAsShipping = useWatch({ control, name: "same_as_shipping" })

  const { customer } = useCustomer(
    customerId!,
    {},
    { enabled: !!customerId },
  )

  const addresses = useComboboxData({
    queryFn: (params) =>
      sdk.admin.customer.listAddresses(customerId!, params),
    queryKey: [type, customerId, "addresses"],
    getOptions: (data) =>
      data.addresses.map((address) => ({
        label: getFormattedAddress({ address }).join(",\n"),
        value: address.id,
      })),
    enabled: !!customerId,
  })

  const onSelectAddress = async (selectedId?: string) => {
    if (!selectedId || !customerId) {
      return
    }

    const { address } = await sdk.admin.customer.retrieveAddress(
      customerId,
      selectedId,
    )

    setValue(type, {
      ...address,
      first_name: address.first_name || customer?.first_name,
      last_name: address.last_name || customer?.last_name,
    } as z.infer<typeof addressSchema>)
  }

  const showFields = type === "billing_address" ? !sameAsShipping : true

  const addressLabel =
    type === "shipping_address"
      ? t("addresses.shippingAddress.label")
      : t("addresses.billingAddress.label")

  const addressHint =
    type === "shipping_address"
      ? t("addresses.shippingAddress.usageHint")
      : t("addresses.billingAddress.usageHint")

  return (
    <div className="grid grid-cols-2 gap-x-3">
      <div className="flex flex-col gap-y-1">
        <Label size="small" weight="plus">
          {addressLabel}
        </Label>
        <Hint>{addressHint}</Hint>
      </div>
      <div className="flex flex-col gap-y-3">
        {type === "billing_address" && (
          <Form.Field
            control={control}
            name="same_as_shipping"
            render={({ field: { value, onChange, ...field } }) => {
              const onCheckedChange = (checked: boolean) => {
                if (!checked) {
                  setValue("billing_address", initialAddress)
                } else {
                  setValue("billing_address_id", "")
                  setValue("billing_address", null)
                }

                onChange(checked)
              }

              return (
                <Form.Item>
                  <div className="grid grid-cols-[28px_1fr] items-start gap-3">
                    <Form.Control>
                      <Switch
                        size="small"
                        {...field}
                        checked={value}
                        onCheckedChange={onCheckedChange}
                      />
                    </Form.Control>
                    <div className="flex flex-col">
                      <Form.Label>
                        {t("addresses.billingAddress.sameAsShipping")}
                      </Form.Label>
                      <Form.Hint>
                        {t("addresses.billingAddress.sameAsShippingHint")}
                      </Form.Hint>
                    </div>
                  </div>
                </Form.Item>
              )
            }}
          />
        )}
        {showFields && (
          <div className="flex flex-col gap-y-3">
            {customerId && (
              <div className="flex flex-col gap-y-3">
                <Form.Field
                  control={control}
                  name={`${type}_id`}
                  render={({ field: { onChange, ...field } }) => {
                    const onRemove = () => {
                      onChange("")
                    }

                    return (
                      <Form.Item>
                        {addressId ? (
                          <AddressCard
                            customerId={customerId}
                            addressId={addressId}
                            tag={
                              type === "shipping_address"
                                ? "shipping"
                                : "billing"
                            }
                            onRemove={onRemove}
                          />
                        ) : (
                          <Fragment>
                            <Form.Label optional variant="subtle">
                              {t("draftOrders.create.savedAddressesLabel")}
                            </Form.Label>
                            <Form.Hint>
                              {t("draftOrders.create.savedAddressesHint")}
                            </Form.Hint>
                            <Form.Control>
                              <Combobox
                                options={addresses.options}
                                fetchNextPage={addresses.fetchNextPage}
                                isFetchingNextPage={
                                  addresses.isFetchingNextPage
                                }
                                searchValue={addresses.searchValue}
                                onSearchValueChange={
                                  addresses.onSearchValueChange
                                }
                                placeholder={
                                  type === "shipping_address"
                                    ? t("addresses.shippingAddress.label")
                                    : t("addresses.billingAddress.label")
                                }
                                onChange={(value) => {
                                  onSelectAddress(value)
                                  onChange(value)
                                }}
                                {...field}
                              />
                            </Form.Control>
                            <Form.ErrorMessage />
                          </Fragment>
                        )}
                      </Form.Item>
                    )
                  }}
                />
                <Divider variant="dashed" />
              </div>
            )}
            {!addressId && (
              <div className="flex flex-col gap-y-3">
                <Form.Field
                  control={control}
                  name={`${type}.country_code`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label variant="subtle">
                        {t("fields.country")}
                      </Form.Label>
                      <Form.Control>
                        <CountrySelect {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Form.Field
                    control={control}
                    name={`${type}.first_name`}
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label variant="subtle">
                          {t("fields.firstName")}
                        </Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={control}
                    name={`${type}.last_name`}
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label variant="subtle">
                          {t("fields.lastName")}
                        </Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>
                <Form.Field
                  control={control}
                  name={`${type}.company`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label optional variant="subtle">
                        {t("fields.company")}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={control}
                  name={`${type}.address_1`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label variant="subtle">
                        {t("fields.address")}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={control}
                  name={`${type}.address_2`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label optional variant="subtle">
                        {t("fields.address2")}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Form.Field
                    control={control}
                    name={`${type}.postal_code`}
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label variant="subtle">
                          {t("fields.postalCode")}
                        </Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                  <Form.Field
                    control={control}
                    name={`${type}.city`}
                    render={({ field }) => (
                      <Form.Item>
                        <Form.Label variant="subtle">
                          {t("fields.city")}
                        </Form.Label>
                        <Form.Control>
                          <Input {...field} />
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )}
                  />
                </div>
                <Form.Field
                  control={control}
                  name={`${type}.province`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label optional variant="subtle">
                        {t("fields.province")}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
                <Form.Field
                  control={control}
                  name={`${type}.phone`}
                  render={({ field }) => (
                    <Form.Item>
                      <Form.Label optional variant="subtle">
                        {t("fields.phone")}
                      </Form.Label>
                      <Form.Control>
                        <Input {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
