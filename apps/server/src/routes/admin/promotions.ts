import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { AdminGetPromotionsParams } from "@my-store/validators/admin-list-params"
import { sql, eq, inArray } from "drizzle-orm"
import { generateId, getDb, promotionRule, promotionRuleValue } from "@my-store/db"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { promotionService } from "../../services/batch.service"

/** 缁熶竴澶勭悊 rules / target-rules / buy-rules 鐨?batch 鎿嶄綔 */
async function handleRuleBatch(promotionId: string, body: {
  create?: Array<{ operator: string; attribute: string; description?: string; values: string[] }>
  update?: Array<{ id: string; operator?: string; attribute?: string; description?: string; values?: string[] }>
  delete?: string[]
}, applicationMethodId?: string | null) {
  const db = getDb()
  const created: any[] = []
  const updated: any[] = []

  // Create
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
      // Insert values
      for (const v of rule.values) {
        await db.insert(promotionRuleValue).values({
          id: generateId("prorulval"),
          value: v,
          promotion_rule_id: ruleId,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
      }
      const [r] = await db.select().from(promotionRule).where(eq(promotionRule.id, ruleId))
      if (r) {
        const vals = await db.select().from(promotionRuleValue).where(eq(promotionRuleValue.promotion_rule_id, ruleId))
        created.push({ ...r, values: vals.map(v => ({ value: v.value })) })
      }
    }
  }

  // Update
  if (body.update?.length) {
    for (const rule of body.update) {
      const setData: Record<string, any> = {}
      if (rule.operator !== undefined) setData.operator = rule.operator
      if (rule.attribute !== undefined) setData.attribute = rule.attribute
      if (rule.description !== undefined) setData.description = rule.description
      setData.updated_at = sql`now()`
      await db.update(promotionRule).set(setData).where(eq(promotionRule.id, rule.id))
      // Replace values if provided
      if (rule.values) {
        await db.delete(promotionRuleValue).where(eq(promotionRuleValue.promotion_rule_id, rule.id))
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
      const [r] = await db.select().from(promotionRule).where(eq(promotionRule.id, rule.id))
      if (r) {
        const vals = await db.select().from(promotionRuleValue).where(eq(promotionRuleValue.promotion_rule_id, rule.id))
        updated.push({ ...r, values: vals.map(v => ({ value: v.value })) })
      }
    }
  }

  // Delete
  if (body.delete?.length) {
    for (const id of body.delete) {
      await db.delete(promotionRuleValue).where(eq(promotionRuleValue.promotion_rule_id, id))
    }
    await db.delete(promotionRule).where(inArray(promotionRule.id, body.delete))
  }

  return { created, updated, deleted: body.delete ?? [] }
}

export const adminPromotions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  // 鈹€鈹€ CRUD 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .get("/", rpcQueryValidator(AdminGetPromotionsParams), async (c) => {
    const result = await promotionService.list(c.req.valid("query"))
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await promotionService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", async (c) => {
    const body = await c.req.json()
    const result = await promotionService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", async (c) => {
    const body = await c.req.json()
    const result = await promotionService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await promotionService.delete(c.req.param("id"))
    return c.json(result)
  })
  // 鈹€鈹€ Rules Batch 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
  .post("/:id/rules/batch", async (c) => {
    const result = await handleRuleBatch(c.req.param("id"), await c.req.json())
    return c.json(result)
  })
  .post("/:id/target-rules/batch", async (c) => {
    const result = await handleRuleBatch(c.req.param("id"), await c.req.json())
    return c.json(result)
  })
  .post("/:id/buy-rules/batch", async (c) => {
    const result = await handleRuleBatch(c.req.param("id"), await c.req.json())
    return c.json(result)
  })

