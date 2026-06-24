import { OnChangeFn, PaginationState } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

export const DEFAULT_TABLE_PAGE_SIZE = 20

export const TABLE_PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500, 1000] as const

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number]

export function getTableLimitKey(prefix?: string) {
  return prefix ? `${prefix}_limit` : "limit"
}

export function getTableOffsetKey(prefix?: string) {
  return prefix ? `${prefix}_offset` : "offset"
}

export function parseTablePageSize(
  value: string | number | null | undefined,
  fallback: number = DEFAULT_TABLE_PAGE_SIZE,
): number {
  const parsed = typeof value === "number" ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return (TABLE_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : fallback
}

export function useTablePageSize(prefix?: string, fallback?: number): number {
  const [searchParams] = useSearchParams()
  const urlLimit = searchParams.get(getTableLimitKey(prefix))
  const defaultSize = fallback ?? DEFAULT_TABLE_PAGE_SIZE

  if (urlLimit !== null) {
    return parseTablePageSize(urlLimit, defaultSize)
  }

  return parseTablePageSize(fallback, defaultSize)
}

export function applyTablePaginationSearchParams(
  params: URLSearchParams,
  {
    prefix,
    pageIndex,
    pageSize,
    prevPageSize,
  }: {
    prefix?: string
    pageIndex: number
    pageSize: number
    prevPageSize: number
  },
): URLSearchParams {
  const next = new URLSearchParams(params)
  const limitKey = getTableLimitKey(prefix)
  const offsetKey = getTableOffsetKey(prefix)

  if (pageSize === DEFAULT_TABLE_PAGE_SIZE) {
    next.delete(limitKey)
  } else {
    next.set(limitKey, String(pageSize))
  }

  if (pageIndex === 0 || pageSize !== prevPageSize) {
    next.delete(offsetKey)
  } else {
    next.set(offsetKey, String(pageIndex * pageSize))
  }

  return next
}

export function useTablePagination(
  prefix?: string,
  pageSizeOverride?: number,
  enabled = true,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const offsetKey = getTableOffsetKey(prefix)
  const urlPageSize = useTablePageSize(prefix, pageSizeOverride)
  const offset = searchParams.get(offsetKey)

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>(
    () => ({
      pageIndex: offset ? Math.ceil(Number(offset) / urlPageSize) : 0,
      pageSize: urlPageSize,
    }),
  )

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize],
  )

  useEffect(() => {
    if (!enabled) {
      return
    }

    const nextIndex = offset ? Math.ceil(Number(offset) / urlPageSize) : 0

    setPagination((prev) => {
      if (prev.pageIndex === nextIndex && prev.pageSize === urlPageSize) {
        return prev
      }

      return {
        pageIndex: nextIndex,
        pageSize: urlPageSize,
      }
    })
  }, [offset, urlPageSize, enabled])

  const onPaginationChange = (
    updater: (old: PaginationState) => PaginationState,
  ) => {
    const state = updater(pagination)
    const prevPageSize = pagination.pageSize

    setSearchParams((prev) =>
      applyTablePaginationSearchParams(prev, {
        prefix,
        pageIndex: state.pageIndex,
        pageSize: state.pageSize,
        prevPageSize,
      }),
    )

    setPagination(state)
    return state
  }

  return {
    pagination,
    onPaginationChange: enabled
      ? (onPaginationChange as OnChangeFn<PaginationState>)
      : undefined,
    pageSize,
  }
}
