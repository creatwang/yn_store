import { Hono } from "hono"
import { adminAuth, type AuthVariables } from "../../middleware/auth"

/**
 * Medusa Admin feature flags — 控制可选模块 UI 显隐。
 * translation: 启用翻译中心与各实体「管理翻译」入口。
 */
export const adminFeatureFlags = new Hono<{ Variables: AuthVariables }>()
  .use("*", adminAuth)
  .get("/", (c) => {
    return c.json({
      feature_flags: {
        translation: true,
        view_configurations: false,
      },
    })
  })
