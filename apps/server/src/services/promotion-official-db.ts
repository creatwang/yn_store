import { and, eq, inArray, isNull, sql } from "drizzle-orm"
import {
  applicationMethod,
  applicationMethodBuyRules,
  applicationMethodTargetRules,
  generateId,
  getDb,
  promotionPromotionRule,
  promotionRule,
  promotionRuleValue,
} from "@my-store/db"

export function sqlRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[]
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Record<string, unknown>[] }).rows
  }
  return []
}

export function normalizeRuleValues(values: unknown): string[] {
  if (values == null) return []
  if (Array.isArray(values)) {
    return values.map((v) =>
      typeof v === "string" ? v : String((v as { value?: string }).value ?? v),
    )
  }
  return [String(values)]
}

export async function selectApplicationMethodByPromotionId(
  promotionId: string,
) {
  const db = getDb()
  const [am] = await db
    .select()
    .from(applicationMethod)
    .where(
      and(
        eq(applicationMethod.promotion_id, promotionId),
        isNull(applicationMethod.deleted_at),
      ),
    )
    .limit(1)
  return am ?? null
}

async function attachRuleValues(
  rows: (typeof promotionRule.$inferSelect)[],
) {
  const rules = []
  for (const row of rows) {
    const db = getDb()
    const vals = await db
      .select()
      .from(promotionRuleValue)
      .where(eq(promotionRuleValue.promotion_rule_id, row.id))
    rules.push({
      ...row,
      values: vals.map((v) => ({ value: v.value })),
    })
  }
  return rules
}

export async function loadPromotionRulesForType(
  promotionId: string,
  ruleType: "rules" | "target-rules" | "buy-rules",
) {
  const db = getDb()

  if (ruleType === "rules") {
    const linked = await db
      .select({ rule: promotionRule })
      .from(promotionPromotionRule)
      .innerJoin(
        promotionRule,
        eq(promotionPromotionRule.promotion_rule_id, promotionRule.id),
      )
      .where(
        and(
          eq(promotionPromotionRule.promotion_id, promotionId),
          isNull(promotionRule.deleted_at),
        ),
      )
    return attachRuleValues(linked.map((r) => r.rule))
  }

  const am = await selectApplicationMethodByPromotionId(promotionId)
  if (!am) return []

  const pivot =
    ruleType === "target-rules"
      ? applicationMethodTargetRules
      : applicationMethodBuyRules

  const linked = await db
    .select({ rule: promotionRule })
    .from(pivot)
    .innerJoin(
      promotionRule,
      eq(pivot.promotion_rule_id, promotionRule.id),
    )
    .where(
      and(
        eq(pivot.application_method_id, am.id),
        isNull(promotionRule.deleted_at),
      ),
    )

  return attachRuleValues(linked.map((r) => r.rule))
}

export async function insertPromotionRuleWithValues(
  rule: {
    attribute: string
    operator: string
    description?: string | null
    values: string[]
  },
) {
  const db = getDb()
  const ruleId = generateId("prorul")
  await db.insert(promotionRule).values({
    id: ruleId,
    attribute: rule.attribute,
    operator: rule.operator,
    description: rule.description ?? null,
    created_at: sql`now()`,
    updated_at: sql`now()`,
  })
  for (const v of rule.values) {
    await db.insert(promotionRuleValue).values({
      id: generateId("prorulval"),
      promotion_rule_id: ruleId,
      value: v,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
  }
  return ruleId
}

export async function linkPromotionCartRule(
  promotionId: string,
  ruleId: string,
) {
  const db = getDb()
  await db
    .insert(promotionPromotionRule)
    .values({
      promotion_id: promotionId,
      promotion_rule_id: ruleId,
    })
    .onConflictDoNothing()
}

export async function linkApplicationMethodRule(
  applicationMethodId: string,
  ruleId: string,
  kind: "target-rules" | "buy-rules",
) {
  const db = getDb()
  const table =
    kind === "target-rules"
      ? applicationMethodTargetRules
      : applicationMethodBuyRules
  await db
    .insert(table)
    .values({
      application_method_id: applicationMethodId,
      promotion_rule_id: ruleId,
    })
    .onConflictDoNothing()
}

export async function deletePromotionRulesByIds(ruleIds: string[]) {
  if (!ruleIds.length) return
  const db = getDb()
  await db
    .delete(promotionRuleValue)
    .where(inArray(promotionRuleValue.promotion_rule_id, ruleIds))
  await db
    .delete(promotionPromotionRule)
    .where(inArray(promotionPromotionRule.promotion_rule_id, ruleIds))
  await db
    .delete(applicationMethodTargetRules)
    .where(
      inArray(applicationMethodTargetRules.promotion_rule_id, ruleIds),
    )
  await db
    .delete(applicationMethodBuyRules)
    .where(inArray(applicationMethodBuyRules.promotion_rule_id, ruleIds))
  await db.delete(promotionRule).where(inArray(promotionRule.id, ruleIds))
}

export async function replacePromotionCartRules(
  promotionId: string,
  ruleInputs: Array<{
    attribute: string
    operator: string
    description?: string | null
    values: string[]
  }>,
) {
  const db = getDb()
  const existing = await db
    .select({ ruleId: promotionPromotionRule.promotion_rule_id })
    .from(promotionPromotionRule)
    .where(eq(promotionPromotionRule.promotion_id, promotionId))
  await deletePromotionRulesByIds(existing.map((r) => r.ruleId))

  for (const r of ruleInputs) {
    const ruleId = await insertPromotionRuleWithValues(r)
    await linkPromotionCartRule(promotionId, ruleId)
  }
}
