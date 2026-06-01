/**
 * Vitest 全局 teardown — 全部测试文件跑完后关闭 DB 连接
 */
export default async function globalTeardown() {
  const { closeDb } = await import("@my-store/db")
  await closeDb()
}
