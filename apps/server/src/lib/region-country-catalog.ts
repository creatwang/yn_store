import { HTTPException } from "hono/http-exception"
import { getCountryByIso2 } from "../../../admin/src/lib/data/countries"

export type RegionCountryRowInput = {
  iso_2: string
  iso_3: string
  num_code: string
  name: string
  display_name: string
  region_id: string
  metadata: null
}

export function resolveRegionCountryRow(
  isoCode: string,
  regionId: string,
): RegionCountryRowInput {
  const meta = getCountryByIso2(isoCode)
  if (!meta) {
    throw new HTTPException(400, {
      message: `Invalid country code: ${isoCode}`,
    })
  }

  return {
    iso_2: meta.iso_2.toLowerCase(),
    iso_3: meta.iso_3,
    num_code: String(meta.num_code),
    name: meta.name,
    display_name: meta.display_name,
    region_id: regionId,
    metadata: null,
  }
}
