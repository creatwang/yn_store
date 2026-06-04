import { Hono } from "hono"
import { eq, inArray, sql } from "drizzle-orm"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { AdminGetPromotionsParams } from "@my-store/validators/admin-list-params"
import {
  generateId,
  getDb,
  applicationMethod,
  promotionRule,
  promotionRuleValue,
} from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { promotionService } from "../../services/batch.service"
import { getPromotionDetail, loadPromotionRules } from "../../services/promotion-detail.service"
import {
  listPromotionRuleAttributeOptions,
  listPromotionRuleValueOptions,
} from "../../lib/promotion-rule-options"

const RULE_TYPES = new Set(["rules", "target-rules", "buy-rules"])

function normalizeRuleBatchBody(body: Record<string, unknown>) {
  if (Array.isArray(body.rules)) {
    const rules = body.rules as Record<string, unknown>[]
    if (rules.some((r) => r.id != null)) {
      return {
        update: rules.map((r) => ({
          id: String(r.id),
          attribute:
            r.attribute !== undefined ? String(r.attribute) : undefined,
          operator:
            r.operator !== undefined ? String(r.operator) : undefined,
          description: r.description as string | undefined,
          values:
            r.values !== undefined ? normalizeRuleValues(r.values) : undefined,
        })),
      }
    }
    return {
      create: rules.map((r) => ({
        attribute: String(r.attribute ?? ""),
        operator: String(r.operator ?? "eq"),
        description: r.description as string | undefined,
        values: normalizeRuleValues(r.values),
      })),
    }
  }
  if (Array.isArray(body.rule_ids)) {
    return { delete: body.rule_ids as string[] }
  }
  return body as {
    create?: Array<{
      operator: string
      attribute: string
      description?: string
      values: string[]
    }>
    update?: Array<{
      id: string
      operator?: string
      attribute?: string
      description?: string
      values?: string[]
    }>
    delete?: string[]
  }
}

function normalizeRuleValues(values: unknown): string[] {
  if (values == null) return []
  if (Array.isArray(values)) {
    return values.map((v) =>
      typeof v === "string" ? v : String((v as { value?: string }).value ?? v),
    )
  }
  return [String(values)]
}

async function resolveApplicationMethodId(promotionId: string) {
  const db = getDb()
  const [am] = await db
    .select({ id: applicationMethod.id })
    .from(applicationMethod)
    .where(eq(applicationMethod.promotion_id, promotionId))
    .limit(1)
  return am?.id ?? null
}

async function handleRuleBatch(
  promotionId: string,
  body: ReturnType<typeof normalizeRuleBatchBody>,
  applicationMethodId?: string | null,
) {
  const db = getDb()
  const created: unknown[] = []
  const updated: unknown[] = []

  if (body.create?.length) {
    for (const rule of body.create) {
      const ruleId = generateId("prorul")
      await db.insert(promotionRule).values({
        id: ruleId,
        attribute: rule.attribute,
        operator: rule.operator,
        description: rule.description ?? null,
        promotion_id: promotionId,
        application_method_id: applicationMethodId ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      for (const v of rule.values) {
        await db.insert(promotionRuleValue).values({
          id: generateId("prorulval"),
          value: v,
          promotion_rule_id: ruleId,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }
      const [r] = await db
        .select()
        .from(promotionRule)
        .where(eq(promotionRule.id, ruleId))
      if (r) {
        const vals = await db
          .select()
          .from(promotionRuleValue)
          .where(eq(promotionRuleValue.promotion_rule_id, ruleId))
        created.push({
          ...r,
          values: vals.map((v) => ({ value: v.value })),
        })
      }
    }
  }

  if (body.update?.length) {
    for (const rule of body.update) {
      const setData: Record<string, unknown> = { updated_at: sql`now()` }
      if (rule.operator !== undefined) setData.operator = rule.operator
      if (rule.attribute !== undefined) setData.attribute = rule.attribute
      if (rule.description !== undefined) {
        setData.description = rule.description
      }
      await db
        .update(promotionRule)
        .set(setData)
        .where(eq(promotionRule.id, rule.id))
      if (rule.values) {
        await db
          .delete(promotionRuleValue)
          .where(eq(promotionRuleValue.promotion_rule_id, rule.id))
        for (const v of rule.values) {
          await db.insert(promotionRuleValue).values({
            id: generateId("prorulval"),
            value: v,
            promotion_rule_id: rule.id,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
        }
      }
      const [r] = await db
        .select()
        .from(promotionRule)
        .where(eq(promotionRule.id, rule.id))
      if (r) {
        const vals = await db
          .select()
          .from(promotionRuleValue)
          .where(eq(promotionRuleValue.promotion_rule_id, rule.id))
        updated.push({
          ...r,
          values: vals.map((v) => ({ value: v.value })),
        })
      }
    }
  }

  if (body.delete?.length) {
    for (const id of body.delete) {
      await db
        .delete(promotionRuleValue)
        .where(eq(promotionRuleValue.promotion_rule_id, id))
    }
    await db.delete(promotionRule).where(inArray(promotionRule.id, body.delete))
  }

  return { created, updated, deleted: body.delete ?? [] }
}

async function applyRuleBatchAndReturnPromotion(
  promotionId: string,
  ruleType: string,
  rawBody: Record<string, unknown>,
) {
  const body = normalizeRuleBatchBody(rawBody)
  let applicationMethodId: string | null = null
  if (ruleType === "target-rules" || ruleType === "buy-rules") {
    applicationMethodId = await resolveApplicationMethodId(promotionId)
  }
  await handleRuleBatch(promotionId, body, applicationMethodId)
  return getPromotionDetail(promotionId)
}

export const adminPromotions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetPromotionsParams), async (c) => {
    const result = await promotionService.list(c.req.valid("query"))
    return c.json(result)
  })
  .get("/rule-attribute-options/:rule_type", async (c) => {
    const ruleType = c.req.param("rule_type")
    if (!RULE_TYPES.has(ruleType)) {
      return c.json({ message: "Invalid rule type" }, 400)
    }
    return c.json(listPromotionRuleAttributeOptions(ruleType))
  })
  .get("/rule-value-options/:rule_type/:rule_attribute_id", async (c) => {
    const ruleType = c.req.param("rule_type")
    if (!RULE_TYPES.has(ruleType)) {
      return c.json({ message: "Invalid rule type" }, 400)
    }
    const result = await listPromotionRuleValueOptions(
      c.req.param("rule_attribute_id"),
      c.req.query(),
    )
    return c.json(result)
  })
  .get("/:id/:rule_type", async (c) => {
    const ruleType = c.req.param("rule_type")
    if (!RULE_TYPES.has(ruleType)) {
      return c.json({ message: "Not found" }, 404)
    }
    const rules = await loadPromotionRules(c.req.param("id"), ruleType)
    return c.json({ rules })
  })
  .get("/:id", async (c) => {
    const result = await getPromotionDetail(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const { promotion } = await promotionService.create(body)
    return c.json(await getPromotionDetail(promotion.id), 201)
  })
  .post("/:id", async (c) => {
    const id = c.req.param("id")
    const body = await c.req.json()
    await promotionService.update(id, body)
    return c.json(await getPromotionDetail(id))
  })
  .delete("/:id", async (c) => {
    const result = await promotionService.delete(c.req.param("id"))
    return c.json(result)
  })
  .post("/:id/rules/batch", async (c) => {
    const result = await applyRuleBatchAndReturnPromotion(
      c.req.param("id"),
      "rules",
      await c.req.json(),
    )
    return c.json(result)
  })
  .post("/:id/target-rules/batch", async (c) => {
    const result = await applyRuleBatchAndReturnPromotion(
      c.req.param("id"),
      "target-rules",
      await c.req.json(),
    )
    return c.json(result)
  })
  .post("/:id/buy-rules/batch", async (c) => {
    const result = await applyRuleBatchAndReturnPromotion(
      c.req.param("id"),
      "buy-rules",
      await c.req.json(),
    )
    return c.json(result)
  })
