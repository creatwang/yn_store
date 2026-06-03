import { Resend } from "resend"
import { BRAND, EMAIL_DOMAIN } from "@my-store/config"

// ---------------------------------------------------------------------------
// Resend client (lazy init, only when RESEND_API_KEY is configured)
// ---------------------------------------------------------------------------
let _resend: Resend | null | undefined

function getResend(): Resend | null {
  if (_resend !== undefined) return _resend

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    _resend = null
    return null
  }

  _resend = new Resend(apiKey)
  return _resend
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
export function adminAppUrl(path: string) {
  const base = process.env.ADMIN_APP_URL || "http://localhost:5173/app"
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

export function storefrontUrl(path: string) {
  const base = process.env.STOREFRONT_URL || "http://localhost:4321"
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
}

// ---------------------------------------------------------------------------
// Email sender
// ---------------------------------------------------------------------------

// 按场景命名的发件地址
type FromScenario = "system" | "verify" | "order" | "shipping" | "returns"

const FROM_MAP: Record<FromScenario, string> = {
  system: `"${BRAND}" <noreply@${EMAIL_DOMAIN}>`,
  verify: `"${BRAND}" <verify@${EMAIL_DOMAIN}>`,
  order: `"${BRAND}" <order@${EMAIL_DOMAIN}>`,
  shipping: `"${BRAND}" <shipping@${EMAIL_DOMAIN}>`,
  returns: `"${BRAND}" <returns@${EMAIL_DOMAIN}>`,
}

async function sendEmail(to: string, subject: string, html: string, scenario: FromScenario = "system") {
  const resend = getResend()

  if (!resend) {
    // Dev fallback: log to console
    if (process.env.NODE_ENV !== "production" || process.env.DEV_MAIL_LOG === "1") {
      console.log(`[dev-mail] ${subject} → ${to}\n${html}`)
    }
    return
  }

  const { error } = await resend.emails.send({
    from: process.env.SMTP_FROM || FROM_MAP[scenario],
    to,
    subject,
    html,
  })

  if (error) {
    console.error(`[mail] Resend error:`, error)
  }
}

// ---------------------------------------------------------------------------
// HTML email wrapper
// ---------------------------------------------------------------------------
function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#1a1a1a;">${BRAND}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <hr style="border:0;border-top:1px solid #e5e5e5;margin-bottom:16px;">
              <p style="margin:0;font-size:12px;color:#999;">
                此邮件由系统自动发送，请勿回复。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buttonHtml(text: string, url: string): string {
  return `<a href="${url}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#3b82f6;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;margin:8px 0;">${text}</a>`
}

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------
export interface PasswordResetResult {
  success: boolean
  reset_token?: string
  reset_url?: string
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string,
): Promise<PasswordResetResult> {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">重置您的密码</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您正在申请重置密码。如果这不是您本人的操作，请忽略这封邮件。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("重 置 密 码", resetUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      此链接有效期 1 小时。若按钮无法点击，请复制以下链接到浏览器：<br>
      <a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;">${resetUrl}</a>
    </p>
  `)
  await sendEmail(email, "重置密码", html, "verify")

  // In dev/test, return the token so e2e flows can work without real email
  if (process.env.NODE_ENV === "test" || process.env.DEV_MAIL_LOG === "1") {
    return { success: true, reset_token: resetToken, reset_url: resetUrl }
  }

  return { success: true }
}

export async function sendInviteEmail(email: string, inviteUrl: string): Promise<void> {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">欢迎加入 ${BRAND}</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您已被邀请成为管理员。请点击下方按钮接受邀请并设置您的账户。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("接 受 邀 请", inviteUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      此邀请有效期 7 天。若按钮无法点击，请复制以下链接到浏览器：<br>
      <a href="${inviteUrl}" style="color:#3b82f6;word-break:break-all;">${inviteUrl}</a>
    </p>
  `)
  await sendEmail(email, "管理后台邀请", html, "system")
}

export async function sendInviteResendEmail(email: string, inviteUrl: string): Promise<void> {
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">邀请已重新发送</h2>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的管理员邀请已更新。请点击下方按钮接受邀请并设置您的账户。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("接 受 邀 请", inviteUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      此邀请有效期 7 天。若按钮无法点击，请复制以下链接到浏览器：<br>
      <a href="${inviteUrl}" style="color:#3b82f6;word-break:break-all;">${inviteUrl}</a>
    </p>
  `)
  await sendEmail(email, "管理后台邀请（重新发送）", html, "system")
}

// ---------------------------------------------------------------------------
// P0 — 订单确认 & 发货通知
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">订单确认</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      感谢您的购买！我们已收到您的订单，正在准备发货。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单详情", detailUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      订单状态更新时将发送邮件通知。有任何疑问请回复此邮件联系我们。
    </p>
  `)
  await sendEmail(email, `订单 #${displayId} 已确认`, html, "order")
}

export async function sendOrderCanceledEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">订单已取消</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的订单已被取消。如有疑问，请联系客服。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      若您未主动取消此订单，请立即联系客服确认。
    </p>
  `)
  await sendEmail(email, `订单 #${displayId} 已取消`, html, "order")
}

export async function sendFulfillmentCreatedEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">备货中</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的订单正在仓库备货，准备发货。我们会在发出后第一时间通知您。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
  `)
  await sendEmail(email, `订单 #${displayId} 正在备货`, html, "shipping")
}

export async function sendShipmentEmail(
  email: string,
  displayId: number | string,
  orderId: string,
  trackingNumbers?: string[],
  trackingUrls?: string[],
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const trackingHtml = trackingNumbers?.length
    ? trackingNumbers.map((tn, i) => {
        const url = trackingUrls?.[i]
        return `<p style="margin:4px 0;font-size:14px;color:#333;">
          运单号：<strong>${tn}</strong>
          ${url ? `<br><a href="${url}" style="color:#3b82f6;font-size:12px;" target="_blank">查看物流</a>` : ""}
        </p>`
      }).join("")
    : ""
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">已发货</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
      您的订单已发出，正在送往您的地址。
    </p>
    ${trackingHtml ? `
    <div style="background:#f0f7ff;padding:12px 16px;border-radius:6px;margin-bottom:24px;">
      ${trackingHtml}
    </div>` : ""}
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单详情", detailUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      物流信息更新可能有延迟，请以承运商官网查询结果为准。
    </p>
  `)
  await sendEmail(email, `订单 #${displayId} 已发货`, html, "shipping")
}

export async function sendOrderUpdatedEmail(
  email: string,
  displayId: number | string,
  orderId: string,
  internalNote?: string | null,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const noteHtml = internalNote
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
        ${internalNote}
      </p>`
    : ""
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">订单已更新</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555;">
      您的订单信息已由商家更新，请查看详情确认变更内容。
    </p>
    ${noteHtml}
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
  `)
  await sendEmail(email, `订单 #${displayId} 已更新`, html, "order")
}

export async function sendReturnRequestedEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">退货申请已提交</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      我们已收到您的退货申请，审核通过后将另行通知后续步骤。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
  `)
  await sendEmail(email, `订单 #${displayId} 退货申请`, html, "returns")
}

export async function sendClaimRequestedEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">索赔申请已提交</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的索赔申请已进入处理流程，我们会尽快与您联系。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
  `)
  await sendEmail(email, `订单 #${displayId} 索赔申请`, html, "returns")
}

export async function sendExchangeRequestedEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">换货申请已提交</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的换货申请已提交，确认后我们将安排后续物流。
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
  `)
  await sendEmail(email, `订单 #${displayId} 换货申请`, html, "returns")
}

export async function sendOrderDeliveredEmail(
  email: string,
  displayId: number | string,
  orderId: string,
): Promise<void> {
  const detailUrl = storefrontUrl(`/orders/${orderId}`)
  const html = emailLayout(`
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a1a;">已送达</h2>
    <p style="margin:0 0 12px;font-size:16px;font-weight:500;color:#333;">
      订单号：#${displayId}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      您的订单已签收送达。感谢您的购买，期待再次光临！
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      ${buttonHtml("查看订单", detailUrl)}
    </div>
    <p style="margin:0;font-size:12px;color:#888;">
      如未收到商品或有任何问题，请及时联系客服。
    </p>
  `)
  await sendEmail(email, `订单 #${displayId} 已送达`, html, "shipping")
}
