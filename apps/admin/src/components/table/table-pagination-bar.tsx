import { Select, Table, clx } from "@medusajs/ui"
import { ComponentPropsWithoutRef } from "react"
import { useTranslation } from "react-i18next"
import {
  TABLE_PAGE_SIZE_OPTIONS,
} from "../../hooks/table/table-pagination"

type TablePaginationBarProps = Omit<
  ComponentPropsWithoutRef<typeof Table.Pagination>,
  "translations"
> & {
  onPageSizeChange?: (pageSize: number) => void
  showPageSizeSelector?: boolean
}

export const TablePaginationBar = ({
  onPageSizeChange,
  showPageSizeSelector = true,
  pageSize,
  className,
  ...props
}: TablePaginationBarProps) => {
  const { t } = useTranslation()

  const translations = {
    of: t("general.of"),
    results: t("general.results"),
    pages: t("general.pages"),
    prev: t("general.prev"),
    next: t("general.next"),
  }

  return (
    <div
      className={clx(
        "text-ui-fg-subtle txt-compact-small-plus flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-3 px-3 py-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {showPageSizeSelector && onPageSizeChange ? (
          <div className="flex items-center gap-x-2">
            <span className="whitespace-nowrap">{t("general.rowsPerPage")}</span>
            <Select
              size="small"
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <Select.Trigger className="w-[88px]">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                  <Select.Item key={size} value={String(size)}>
                    {size}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        ) : null}
      </div>
      <Table.Pagination
        className="flex-shrink-0 !p-0"
        pageSize={pageSize}
        translations={translations}
        {...props}
      />
    </div>
  )
}
