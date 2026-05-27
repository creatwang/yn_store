import { loadEnv } from "../load-env"
import { checkDatabaseConnection } from "../src/lib/check-db"

loadEnv()

const result = await checkDatabaseConnection()
if (result.ok) {
  console.log("数据库连接成功")
  process.exit(0)
}

console.error(result.message ?? "数据库连接失败")
process.exit(1)
