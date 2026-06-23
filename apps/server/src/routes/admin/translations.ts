import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { rpcQueryValidator } from "../../lib/infra/query/rpc-query-validator"
import {
  AdminBatchTranslations,
  AdminBatchTranslationSettings,
  AdminGetTranslationsParams,
  AdminTranslationEntitiesParams,
  AdminTranslationSettingsParams,
  AdminTranslationStatisticsParams,
} from "@my-store/validators/medusa/admin/translations/validators"
import { translationService } from "../../services/translation.service"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

export const adminTranslations = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", rpcQueryValidator(AdminGetTranslationsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await translationService.list(query)
    return c.json(result)
  })
  .post("/batch", zValidator("json", AdminBatchTranslations), async (c) => {
    const body = c.req.valid("json")
    const result = await translationService.batch(body)
    return c.json(result)
  })
  .get("/entities", rpcQueryValidator(AdminTranslationEntitiesParams), async (c) => {
    const query = c.req.valid("query")
    const result = await translationService.entities(query)
    return c.json(result)
  })
  .get("/settings", rpcQueryValidator(AdminTranslationSettingsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await translationService.settings(query)
    return c.json(result)
  })
  .post("/settings/batch", zValidator("json", AdminBatchTranslationSettings), async (c) => {
    const body = c.req.valid("json")
    const result = await translationService.batchSettings(body)
    return c.json(result)
  })
  .get("/statistics", rpcQueryValidator(AdminTranslationStatisticsParams), async (c) => {
    const query = c.req.valid("query")
    const result = await translationService.statistics(query)
    return c.json(result)
  })
