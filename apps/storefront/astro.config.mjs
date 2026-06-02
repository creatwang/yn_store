import { defineConfig, passthroughImageService } from "astro/config"
import node from "@astrojs/node"
import vercel from "@astrojs/vercel"
import sitemap from "@astrojs/sitemap"
import tailwind from "@astrojs/tailwind"

/** node | vercel | cloudflare */
const deployTarget = process.env.ASTRO_DEPLOY_TARGET || "node"
const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321"
/** server = 全 SSR（dev 快）；static = Hybrid SSG（产线 SEO） */
const output = process.env.ASTRO_OUTPUT === "static" ? "static" : "server"

const extraImageDomains =
  process.env.PUBLIC_IMAGE_DOMAINS?.split(",")
    .map((d) => d.trim())
    .filter(Boolean) ?? []

const imageDomains = [
  "medusa-public-images.s3.eu-west-1.amazonaws.com",
  ...extraImageDomains,
]

function resolveImageService() {
  if (deployTarget === "cloudflare") {
    return passthroughImageService()
  }
  return undefined
}

function pickAdapter() {
  switch (deployTarget) {
    case "vercel":
      return vercel()
    case "cloudflare":
      throw new Error(
        "ASTRO_DEPLOY_TARGET=cloudflare 需先: pnpm add @astrojs/cloudflare",
      )
    default:
      return node({ mode: "standalone" })
  }
}

export default defineConfig({
  site,
  output,
  adapter: pickAdapter(),
  integrations: [tailwind(), sitemap()],
  server: {
    port: 4321,
    host: true,
  },
  image: {
    domains: imageDomains,
    remotePatterns: [{ protocol: "https" }],
    layout: "constrained",
    responsiveStyles: true,
    service: resolveImageService(),
  },
})
