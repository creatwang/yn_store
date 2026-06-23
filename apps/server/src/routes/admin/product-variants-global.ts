import { Hono } from "hono"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import { AdminGetProductVariantsParams } from "@my-store/validators/admin-list-params"
import { variantService } from "../../services/variant.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

/** 瀵归綈瀹樻柟 GET /admin/product-variants */
export const adminProductVariantsGlobal = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetProductVariantsParams), async (c) => {
    const q = c.req.valid("query")
    const result = await variantService.listAll({
      limit: typeof q.limit === "number" ? q.limit : 50,
      offset: typeof q.offset === "number" ? q.offset : 0,
      q: typeof q.q === "string" ? q.q : undefined,
      id: q.id as string | string[] | undefined,
    })
    return c.json(result)
  })

