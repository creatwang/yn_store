// @ts-nocheck
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Avatar, IconButton, Skeleton, Text } from "@medusajs/ui"

import { useCustomer } from "../../../hooks/api/customers"

type CustomerCardProps = {
  customerId: string
  onRemove?: () => void | Promise<void>
}

export const CustomerCard = ({ customerId, onRemove }: CustomerCardProps) => {
  const { customer, isPending, isError, error } = useCustomer(customerId)

  if (isError) {
    throw error
  }

  const isReady = !isPending && !!customer

  return (
    <div className="bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-between gap-4 rounded-xl p-4">
      {!isReady ? <CustomerCardSkeleton /> : <CustomerInfo customer={customer} />}
      {onRemove && (
        <IconButton
          size="small"
          variant="transparent"
          type="button"
          onClick={onRemove}
        >
          <XMark />
        </IconButton>
      )}
    </div>
  )
}

const CustomerCardSkeleton = () => (
  <div className="flex flex-1 items-center gap-4">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-5 w-40" />
    </div>
  </div>
)

const CustomerInfo = ({
  customer,
}: {
  customer: HttpTypes.AdminCustomer
}) => {
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
  const fallback = (name ? name[0] : customer.email?.[0]) ?? "?"

  return (
    <div className="flex flex-1 items-center gap-4">
      <Avatar size="small" fallback={fallback} />
      <div className="flex flex-col">
        {name && (
          <Text size="small" leading="compact" weight="plus">
            {name}
          </Text>
        )}
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {customer.email}
        </Text>
      </div>
    </div>
  )
}
