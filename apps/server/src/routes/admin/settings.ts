import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import {
  createProductTagSchema,
  updateProductTagSchema,
  createProductTypeSchema,
  updateProductTypeSchema,
  createTaxRegionSchema,
  updateTaxRegionSchema,
  createReturnReasonSchema,
  updateReturnReasonSchema,
  createRefundReasonSchema,
  updateRefundReasonSchema,
} from "@my-store/validators"
import {
  AdminGetProductTagsParams,
  AdminGetProductTypesParams,
  AdminGetTaxRegionsParams,
  AdminGetReturnReasonsParams,
  AdminGetRefundReasonsParams,
} from "@my-store/validators/admin-list-params"
import {
  productTagService,
  productTypeService,
  taxRegionService,
  returnReasonService,
  refundReasonService,
} from "../../services/settings.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"
import { batchDeleteByIdsSchema } from "@my-store/validators"

export const adminProductTags = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetProductTagsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await productTagService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await productTagService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createProductTagSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productTagService.create(body)
    return c.json(result, 201)
  })
  .post("/batch", zValidator("json", batchDeleteByIdsSchema), async (c) => {
    const { ids } = c.req.valid("json")
    const result = await productTagService.batchDelete(ids)
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateProductTagSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productTagService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await productTagService.delete(c.req.param("id"))
    return c.json(result)
  })

export const adminProductTypes = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetProductTypesParams), async (c) => {
    const query = c.req.valid("query")
    const result = await productTypeService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await productTypeService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createProductTypeSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productTypeService.create(body)
    return c.json(result, 201)
  })
  .post("/batch", zValidator("json", batchDeleteByIdsSchema), async (c) => {
    const { ids } = c.req.valid("json")
    const result = await productTypeService.batchDelete(ids)
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateProductTypeSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productTypeService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await productTypeService.delete(c.req.param("id"))
    return c.json(result)
  })

export const adminTaxRegions = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetTaxRegionsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await taxRegionService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await taxRegionService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createTaxRegionSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await taxRegionService.create(body)
    return c.json(result, 201)
  })
  .post("/:id", zValidator("json", updateTaxRegionSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await taxRegionService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await taxRegionService.delete(c.req.param("id"))
    return c.json(result)
  })

export const adminReturnReasons = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetReturnReasonsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await returnReasonService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await returnReasonService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createReturnReasonSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await returnReasonService.create(body)
    return c.json(result, 201)
  })
  .post("/batch", zValidator("json", batchDeleteByIdsSchema), async (c) => {
    const { ids } = c.req.valid("json")
    const result = await returnReasonService.batchDelete(ids)
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateReturnReasonSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await returnReasonService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await returnReasonService.delete(c.req.param("id"))
    return c.json(result)
  })

export const adminRefundReasons = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetRefundReasonsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await refundReasonService.list(query)
    return c.json(result)
  })
  .get("/:id", async (c) => {
    const result = await refundReasonService.getById(c.req.param("id"))
    return c.json(result)
  })
  .post("/", zValidator("json", createRefundReasonSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await refundReasonService.create(body)
    return c.json(result, 201)
  })
  .post("/batch", zValidator("json", batchDeleteByIdsSchema), async (c) => {
    const { ids } = c.req.valid("json")
    const result = await refundReasonService.batchDelete(ids)
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateRefundReasonSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await refundReasonService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await refundReasonService.delete(c.req.param("id"))
    return c.json(result)
  })

