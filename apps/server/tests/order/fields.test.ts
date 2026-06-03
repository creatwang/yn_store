import { describe, expect, it } from "vitest"
import {
  needsFullOrderDetailLoad,
  resolveOrderFieldsConfig,
} from "../../src/services/order/fields"

describe("needsFullOrderDetailLoad", () => {
  it("currency_code only → lightweight", () => {
    const config = resolveOrderFieldsConfig("currency_code")
    expect(needsFullOrderDetailLoad(config)).toBe(false)
  })

  it("*items → full load", () => {
    const config = resolveOrderFieldsConfig("id,*items")
    expect(needsFullOrderDetailLoad(config)).toBe(true)
  })
})
