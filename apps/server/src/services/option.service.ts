import { and, eq, isNull, sql } from "drizzle-orm"
import { generateId, getDb, productOption, productOptionValue } from "@my-store/db"
import { HTTPException } from "hono/http-exception"
import { attachOptionValues } from "../lib/product/product-option-values-batch"

export const optionService = {
  async listOptions(productId: string) {
    const db = getDb()
    const options = await db.select()
      .from(productOption)
      .where(and(
        eq(productOption.product_id, productId),
        isNull(productOption.deleted_at)
      ))

    return { options: await attachOptionValues(db, options) }
  },

  async getOption(productId: string, optionId: string) {
    const db = getDb()
    const [item] = await db.select().from(productOption)
      .where(and(
        eq(productOption.id, optionId),
        eq(productOption.product_id, productId),
        isNull(productOption.deleted_at)
      )).limit(1)

    if (!item) throw new HTTPException(404, { message: "Option not found" })

    const values = await db.select()
      .from(productOptionValue)
      .where(eq(productOptionValue.option_id, optionId))

    return { option: { ...item, values } }
  },

  async createOption(productId: string, input: {
    title: string; values?: string[];
    metadata?: Record<string, unknown>;
  }) {
    const db = getDb()
    const id = generateId("opt")

    const [created] = await db.insert(productOption).values({
      id,
      product_id: productId,
      title: input.title,
      metadata: input.metadata ?? null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }).returning()

    const optValues = (input.values ?? []).map((v) => ({
      id: generateId("optval"),
      option_id: id,
      value: v,
      metadata: null as any,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }))

    if (optValues.length > 0) {
      await db.insert(productOptionValue).values(optValues)
    }

    const values = await db.select()
      .from(productOptionValue)
      .where(eq(productOptionValue.option_id, id))

    return { option: { ...created, values } }
  },

  async updateOption(productId: string, optionId: string, input: Record<string, any>) {
    const db = getDb()
    await this.getOption(productId, optionId)

    const setData: Record<string, any> = { updated_at: sql`now()` }
    if (input.title !== undefined) setData.title = input.title
    if (input.metadata !== undefined) setData.metadata = input.metadata

    const [updated] = await db.update(productOption)
      .set(setData)
      .where(eq(productOption.id, optionId))
      .returning()

    const values = await db.select()
      .from(productOptionValue)
      .where(eq(productOptionValue.option_id, optionId))

    return { option: { ...updated, values } }
  },

  async deleteOption(productId: string, optionId: string) {
    const db = getDb()
    await this.getOption(productId, optionId)

    await db.update(productOption)
      .set({ deleted_at: sql`now()`, updated_at: sql`now()` })
      .where(eq(productOption.id, optionId))

    return { deleted: true }
  },
}
