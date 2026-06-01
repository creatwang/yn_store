import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// Transporter (lazy init, only when SMTP_HOST is configured)
// ---------------------------------------------------------------------------
let _transporter: nodemailer.Transporter | null | undefined

function getTransporter(): nodemailer.Transporter | null {
  if (_transporter !== undefined) return _transporter

  const host = process.env.SMTP_HOST
  if (!host) {
    _transporter = null
    return null
  }

  _transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
    },
  })

  return _transporter
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
const BRAND = "My Medusa Store"
const FROM = process.env.SMTP_FROM || `"${BRAND}" <noreply@mystore.com>`

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter()

  if (!transporter) {
    // Dev fallback: log to console
    if (process.env.NODE_ENV !== "production" || process.env.DEV_MAIL_LOG === "1") {
      console.log(`[dev-mail] ${subject} → ${to}\n${html}`)
    }
    return
  }

  await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  })
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
  await sendEmail(email, "重置密码", emailLayout(`
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
  `))

  // In dev/test, return the token so e2e flows can work without real email
  if (process.env.NODE_ENV === "test" || process.env.DEV_MAIL_LOG === "1") {
    return { success: true, reset_token: resetToken, reset_url: resetUrl }
  }

  return { success: true }
}

export async function sendInviteEmail(email: string, inviteUrl: string): Promise<void> {
  await sendEmail(email, "管理后台邀请", emailLayout(`
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
  `))
}

export async function sendInviteResendEmail(email: string, inviteUrl: string): Promise<void> {
  await sendEmail(email, "管理后台邀请（重新发送）", emailLayout(`
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
  `))
}
