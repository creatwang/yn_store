// @ts-nocheck
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Badge, IconButton, Skeleton, Text } from "@medusajs/ui"

import { useCustomerAddress } from "../../../hooks/api/customers"
import { getFormattedAddress } from "../../../lib/addresses/addresses"

type AddressCardProps = {
  customerId: string
  addressId: string
  tag?: "shipping" | "billing"
  onRemove?: () => void | Promise<void>
}

export const AddressCard = ({
  customerId,
  addressId,
  tag = "shipping",
  onRemove,
}: AddressCardProps) => {
  const { address, isPending, isError, error } = useCustomerAddress(
    customerId,
    addressId,
  )

  if (isError) {
    throw error
  }

  const isReady = !isPending && !!address

  return (
    <div className="bg-ui-bg-component shadow-elevation-card-rest flex flex-col gap-4 rounded-xl p-4">
      {!isReady ? (
        <AddressCardSkeleton />
      ) : (
        <AddressInfo address={address} />
      )}
      <div className="flex items-center justify-between gap-4">
        <Badge size="2xsmall" color="grey">
          {tag === "shipping" ? "Shipping" : "Billing"}
        </Badge>
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
    </div>
  )
}

const AddressCardSkeleton = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-5 w-48" />
    <Skeleton className="h-5 w-40" />
  </div>
)

const AddressInfo = ({
  address,
}: {
  address: HttpTypes.AdminCustomerAddress
}) => {
  const addressSegments = getFormattedAddress({ address })

  return (
    <div className="flex flex-col">
      {address.address_name && (
        <Text size="small" leading="compact" weight="plus">
          {address.address_name}
        </Text>
      )}
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {addressSegments.map((segment, idx) => (
          <span key={idx}>
            {segment}
            {idx < addressSegments.length - 1 && ", "}
          </span>
        ))}
      </Text>
    </div>
  )
}
