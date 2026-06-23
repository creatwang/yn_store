import { describeDbPool } from "@my-store/db"
import { maskDatabaseUrl } from "../../load-env"

/** 各 entry 统一打印 Druid 式连接池配置 */
export function logDbPoolAtStartup(dbUrl: string) {
  console.log(`📦 DATABASE_URL → ${maskDatabaseUrl(dbUrl)}`)
  const pool = describeDbPool(dbUrl)
  console.log(
    `📦 DB pool (Druid): maxActive=${pool.maxActive}, ` +
      `maxWait=${pool.maxWaitLabel}, connect_timeout=${pool.connectTimeoutSec}s`,
  )
  console.log(`   ${pool.queuePolicy}`)
  if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
    console.warn(
      "⚠️  当前连接指向本机 PostgreSQL。若使用 Supabase，请检查 apps/server/.env 并完整重启 dev。",
    )
  }
}
