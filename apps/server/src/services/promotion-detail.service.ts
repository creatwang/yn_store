import { and, eq, isNull } from "drizzle-orm"
import {
  applicationMethod,
  getDb,
  promotion,
  promotionRule,
  promotionRuleValue,
} from "@my-store/db"
import { HTTPException } from "hono/http-exception"

async function loadRuleValues(ruleId: string) {
  const db = getDb()
  const vals = await db
    .select()
    .from(promotionRuleValue)
    .where(eq(promotionRuleValue.promotion_rule_id, ruleId))
  return vals.map((v) => ({ value: v.value }))
}

export async function loadPromotionRules(
  promotionId: string,
  ruleType: string,
) {
  const db = getDb()
  const [am] = await db
    .select()
    .from(applicationMethod)
    .where(eq(applicationMethod.promotion_id, promotionId))
    .limit(1)

  const rows = await db
    .select()
    .from(promotionRule)
    .where(eq(promotionRule.promotion_id, promotionId))

  const filtered = rows.filter((row) => {
    if (ruleType === "rules") {
      return row.application_method_id == null
    }
    if (!am) return false
    if (ruleType === "target-rules") {
      return row.application_method_id === am.id
    }
    if (ruleType === "buy-rules") {
      return row.application_method_id === am.id
    }
    return false
  })

  const rules = []
  for (const row of filtered) {
    const values = await loadRuleValues(row.id)
    rules.push({
      ...row,
      values,
    })
  }
  return rules
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

  const [am] = await db
    .select()
    .from(applicationMethod)
    .where(eq(applicationMethod.promotion_id, id))
    .limit(1)

  const rules = await loadPromotionRules(id, "rules")
  let application_method = am ?? undefined
  if (am) {
    const buy_rules = await loadPromotionRules(id, "buy-rules")
    const target_rules = await loadPromotionRules(id, "target-rules")
    application_method = {
      ...am,
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
