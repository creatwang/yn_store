import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb, regionCountry } from "@my-store/db"
import { resolveRegionCountryRow } from "./region-country-catalog"

export type RegionCountryDto = {
  iso_2: string
  iso_3: string | null
  num_code: string | null
  name: string
  display_name: string
}

export function toRegionCountryDto(
  row: typeof regionCountry.$inferSelect,
): RegionCountryDto {
  return {
    iso_2: row.iso_2,
    iso_3: row.iso_3,
    num_code: row.num_code,
    name: row.name,
    display_name: row.display_name,
  }
}

export async function loadCountriesByRegionIds(
  regionIds: string[],
): Promise<Map<string, RegionCountryDto[]>> {
  const map = new Map<string, RegionCountryDto[]>()
  if (!regionIds.length) return map

  const db = getDb()
  const rows = await db
    .select()
    .from(regionCountry)
    .where(
      and(
        inArray(regionCountry.region_id, regionIds),
        isNull(regionCountry.deleted_at),
      ),
    )

  for (const row of rows) {
    if (!row.region_id) continue
    const list = map.get(row.region_id) ?? []
    list.push(toRegionCountryDto(row))
    map.set(row.region_id, list)
  }

  return map
}

export async function syncRegionCountries(
  regionId: string,
  isoCodes: string[],
): Promise<void> {
  const db = getDb()
  const codes = [
    ...new Set(
      isoCodes.map((c) => c.toLowerCase().trim()).filter(Boolean),
    ),
  ]

  const current = await db
    .select()
    .from(regionCountry)
    .where(
      and(
        eq(regionCountry.region_id, regionId),
        isNull(regionCountry.deleted_at),
      ),
    )

  const remove = current.filter((c) => !codes.includes(c.iso_2))
  if (remove.length) {
    await db
      .update(regionCountry)
      .set({
        region_id: null,
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(
        inArray(
          regionCountry.iso_2,
          remove.map((c) => c.iso_2),
        ),
      )
  }

  for (const iso of codes) {
    const payload = resolveRegionCountryRow(iso, regionId)
    const [existing] = await db
      .select()
      .from(regionCountry)
      .where(eq(regionCountry.iso_2, iso))
      .limit(1)

    if (existing) {
      await db
        .update(regionCountry)
        .set({
          ...payload,
          deleted_at: null,
          updated_at: sql`now()`,
        })
        .where(eq(regionCountry.iso_2, iso))
    } else {
      await db.insert(regionCountry).values({
        ...payload,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
    }
  }
}
