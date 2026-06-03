import { Hono } from "hono"
import { imageService } from "../../services/image.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminProductImages = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/:productId/images", async (c) => {
    const result = await imageService.listImages(c.req.param("productId"))
    return c.json(result)
  })
  .post("/:productId/images", async (c) => {
    const body = await c.req.json()
    const { url, rank, metadata } = body
    if (!url) return c.json({ message: "url required" }, 400)
    const result = await imageService.createImage(c.req.param("productId"), { url, rank, metadata })
    return c.json(result, 201)
  })
  /*
   * 瀵归綈瀹樻柟 batchImageVariantsWorkflow
   * POST /admin/products/:id/images/:imageId/variants/batch
   * body: { add: string[], remove: string[] }
   * returns: { added: string[], removed: string[] }
   */
  .post("/:productId/images/:imageId/variants/batch", async (c) => {
    const body = await c.req.json()
    const result = await imageService.batchImageVariants(c.req.param("imageId"), body)
    return c.json(result)
  })
  .delete("/:productId/images/:imageId", async (c) => {
    const result = await imageService.deleteImage(c.req.param("productId"), c.req.param("imageId"))
    return c.json(result)
  })
