import { Hono } from "hono"

export const rebuildWebhook = new Hono().post("/rebuild-storefront", async (c) => {
  const secret = process.env.WEBHOOK_SECRET
  const header = c.req.header("x-webhook-secret")

  if (secret && header !== secret) {
    return c.json({ error: "unauthorized" }, 401)
  }

  const deployHook = process.env.DEPLOY_HOOK_URL
  if (!deployHook) {
    return c.json({
      ok: true,
      message: "webhook received (DEPLOY_HOOK_URL not configured)",
    })
  }

  const res = await fetch(deployHook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "storefront.rebuild" }),
  })

  if (!res.ok) {
    return c.json({ error: "deploy hook failed", status: res.status }, 502)
  }

  return c.json({ ok: true, triggered: true })
})
