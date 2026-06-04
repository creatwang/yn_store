import { and, eq, isNull } from "drizzle-orm"
import { getDb, promotion } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import {
  loadPromotionRulesForType,
  selectApplicationMethodByPromotionId,
} from "./promotion-official-db"

export async function loadPromotionRules(
  promotionId: string,
  ruleType: string,
) {
  if (
    ruleType !== "rules" &&
    ruleType !== "target-rules" &&
    ruleType !== "buy-rules"
  ) {
    return []
  }
  return loadPromotionRulesForType(
    promotionId,
    ruleType as "rules" | "target-rules" | "buy-rules",
  )
}

export async function getPromotionDetail(id: string) {
  const db = getDb()
  const [item] = await db
    .select()
    .from(promotion)
    .where(and(eq(promotion.id, id), isNull(promotion.deleted_at)))
    .limit(1)

  if (!item) {
    throw new HTTPException(404, { message: "Promotion not found" })
  }

  const am = await selectApplicationMethodByPromotionId(id)
  const rules = await loadPromotionRules(id, "rules")

  let application_method = am ?? undefined
  if (am) {
    const buy_rules = await loadPromotionRules(id, "buy-rules")
    const target_rules = await loadPromotionRules(id, "target-rules")
    application_method = {
      ...am,
      type: am.type ?? "percentage",
      target_type: am.target_type ?? "items",
      allocation: am.allocation ?? "across",
      buy_rules,
      target_rules,
    } as typeof am & {
      buy_rules: typeof buy_rules
      target_rules: typeof target_rules
    }
  }

  return {
    promotion: {
      ...item,
      application_method,
      rules,
    },
  }
}
