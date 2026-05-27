import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm"
import {
  generateId,
  getDb,
  customer,
  customerAddress,
} from "@my-store/db"
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
  CreateCustomerAddressInput,
  UpdateCustomerAddressInput,
} from "@my-store/validators"
import { HTTPException } from "hono/http-exception"

export const customerService = {
  async list(query: ListCustomersQuery) {
    const db = getDb()
    const conditions = [isNull(customer.deleted_at)]

    if (query.has_account !== undefined) {
      conditions.push(eq(customer.has_account, query.has_account))
    }

    if (query.q) {
      conditions.push(
        or(
          ilike(customer.email, `%${query.q}%`),
          ilike(customer.first_name, `%${query.q}%`),
          ilike(customer.last_name, `%${query.q}%`)
        )!
      )
    }

    const where = and(...conditions)

    const [customers, [{ total }]] = await Promise.all([
      db
        .select()
        .from(customer)
        .where(where)
        .orderBy(desc(customer.created_at))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(customer).where(where),
    ])

    return {
      customers,
      count: Number(total),
      limit: query.limit,
      offset: query.offset,
    }
  },

  async getById(id: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(customer)
      .where(and(eq(customer.id, id), isNull(customer.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Customer not found" })
    }

    const addresses = await db
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.customer_id, id),
          isNull(customerAddress.deleted_at)
        )
      )

    return { customer: { ...item, addresses } }
  },

  async getByEmail(email: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(customer)
      .where(and(eq(customer.email, email), isNull(customer.deleted_at)))
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Customer not found" })
    }

    return { customer: item }
  },

  async create(input: CreateCustomerInput) {
    const db = getDb()
    const id = generateId("cus")

    const [created] = await db
      .insert(customer)
      .values({
        id,
        company_name: input.company_name ?? null,
        first_name: input.first_name ?? null,
        last_name: input.last_name ?? null,
        email: input.email,
        phone: input.phone ?? null,
        has_account: input.has_account ?? false,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { customer: created }
  },

  async update(id: string, input: UpdateCustomerInput) {
    const db = getDb()
    await this.getById(id)

    const [updated] = await db
      .update(customer)
      .set({
        ...(input.company_name !== undefined && { company_name: input.company_name }),
        ...(input.first_name !== undefined && { first_name: input.first_name }),
        ...(input.last_name !== undefined && { last_name: input.last_name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.has_account !== undefined && { has_account: input.has_account }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(and(eq(customer.id, id), isNull(customer.deleted_at)))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Customer not found" })
    }

    return { customer: updated }
  },

  async listAddresses(customerId: string) {
    const db = getDb()
    const addresses = await db
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.customer_id, customerId),
          isNull(customerAddress.deleted_at)
        )
      )

    return { addresses }
  },

  async getAddress(customerId: string, addressId: string) {
    const db = getDb()
    const [item] = await db
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.id, addressId),
          eq(customerAddress.customer_id, customerId),
          isNull(customerAddress.deleted_at)
        )
      )
      .limit(1)

    if (!item) {
      throw new HTTPException(404, { message: "Address not found" })
    }

    return { address: item }
  },

  async createAddress(customerId: string, input: CreateCustomerAddressInput) {
    const db = getDb()
    await this.getById(customerId)
    const id = generateId("cuaddr")

    const [created] = await db
      .insert(customerAddress)
      .values({
        id,
        customer_id: customerId,
        address_name: input.address_name ?? null,
        is_default_shipping: input.is_default_shipping ?? false,
        is_default_billing: input.is_default_billing ?? false,
        company: input.company ?? null,
        first_name: input.first_name ?? null,
        last_name: input.last_name ?? null,
        address_1: input.address_1,
        address_2: input.address_2 ?? null,
        city: input.city,
        country_code: input.country_code,
        province: input.province ?? null,
        postal_code: input.postal_code ?? null,
        phone: input.phone ?? null,
        metadata: input.metadata ?? null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returning()

    return { address: created }
  },

  async updateAddress(customerId: string, addressId: string, input: UpdateCustomerAddressInput) {
    const db = getDb()
    await this.getAddress(customerId, addressId)

    const [updated] = await db
      .update(customerAddress)
      .set({
        ...(input.address_name !== undefined && { address_name: input.address_name }),
        ...(input.is_default_shipping !== undefined && { is_default_shipping: input.is_default_shipping }),
        ...(input.is_default_billing !== undefined && { is_default_billing: input.is_default_billing }),
        ...(input.company !== undefined && { company: input.company }),
        ...(input.first_name !== undefined && { first_name: input.first_name }),
        ...(input.last_name !== undefined && { last_name: input.last_name }),
        ...(input.address_1 !== undefined && { address_1: input.address_1 }),
        ...(input.address_2 !== undefined && { address_2: input.address_2 }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.country_code !== undefined && { country_code: input.country_code }),
        ...(input.province !== undefined && { province: input.province }),
        ...(input.postal_code !== undefined && { postal_code: input.postal_code }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(customerAddress.id, addressId),
          eq(customerAddress.customer_id, customerId),
          isNull(customerAddress.deleted_at)
        )
      )
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: "Address not found" })
    }

    return { address: updated }
  },

  async deleteAddress(customerId: string, addressId: string) {
    const db = getDb()
    await this.getAddress(customerId, addressId)

    await db
      .update(customerAddress)
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(
        and(
          eq(customerAddress.id, addressId),
          eq(customerAddress.customer_id, customerId),
          isNull(customerAddress.deleted_at)
        )
      )

    return { success: true }
  },
}
