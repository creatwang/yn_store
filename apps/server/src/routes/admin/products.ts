import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { batchDeleteProductsSchema, createProductSchema, updateProductSchema } from "@my-store/validators"
import { AdminGetProductsParams } from "@my-store/validators/admin-list-params"
import { rpcQueryValidator } from "../../lib/rpc-query-validator"
import { productService } from "../../services/product.service"
import {
  productExportService,
  productImportService,
} from "../../services/product-import.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProducts = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetProductsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await productService.list(query)
    return c.json(result)
  })
  .get("/export/:transactionId", async (c) => {
    const { readFile } = await import("node:fs/promises")
    const pathMod = await import("node:path")
    const file = pathMod.join(
      process.cwd(),
      "public/exports",
      `${c.req.param("transactionId")}.csv`,
    )
    try {
      const csv = await readFile(file, "utf-8")
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="products-${c.req.param("transactionId")}.csv"`,
        },
      })
    } catch {
      return c.json({ message: "导出文件不存在" }, 404)
    }
  })
  .get("/:id", async (c) => {
    const raw = c.req.query("fields")
    const fields = raw ? raw.split(",").filter(Boolean) : undefined
    const result = await productService.getById(c.req.param("id"), false, fields)
    return c.json(result)
  })
  .post("/", zValidator("json", createProductSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productService.create(body)
    return c.json(result, 201)
  })
  .post("/export", async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const result = await productExportService.export(body, {
      receiver_id: c.get("user").actor_id,
    })
    return c.json(result)
  })
  .post("/import", async (c) => {
    const contentType = c.req.header("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        return c.json({ message: "请上传 CSV 文件" }, 400)
      }
      const csvText = await file.text()
      const result = await productImportService.prepareFromCsv(csvText)
      return c.json(result)
    }
    const body = await c.req.json().catch(() => ({}))
    if (body.csv) {
      const result = await productImportService.prepareFromCsv(String(body.csv))
      return c.json(result)
    }
    return c.json({ message: "请提供 CSV 文件或 csv 字段" }, 400)
  })
  .post("/import/:transactionId/confirm", async (c) => {
    const result = await productImportService.confirm(
      c.req.param("transactionId"),
      { receiver_id: c.get("user").actor_id },
    )
    return c.json(result)
  })
  .post("/batch", zValidator("json", batchDeleteProductsSchema), async (c) => {
    const { ids } = c.req.valid("json")
    const result = await productService.batchDelete(ids)
    return c.json(result)
  })
  .post("/:id", zValidator("json", updateProductSchema), async (c) => {
    const body = c.req.valid("json")
    const result = await productService.update(c.req.param("id"), body)
    return c.json(result)
  })
  .post("/:id/generate-skus", async (c) => {
    const result = await productService.generateSkus(c.req.param("id"))
    return c.json(result)
  })
  .delete("/:id", async (c) => {
    const result = await productService.delete(c.req.param("id"))
    return c.json(result)
  })
