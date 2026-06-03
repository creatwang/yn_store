/** Druid 式连接池配置（与 DATABASE_URL 端口无关，只认环境变量） */

export function isSupabasePooler(connectionString: string) {
  return connectionString.includes("pooler.supabase.com")
}

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  cap?: number,
): number {
  if (!raw?.trim()) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return fallback
  return cap ? Math.min(Math.floor(n), cap) : Math.floor(n)
}

/** Druid maxActive：默认 20，Vitest 2，上限 50 */
export function resolvePoolMax(_connectionString: string): number {
  const fromEnv = process.env.DB_POOL_MAX
  if (fromEnv?.trim()) {
    return parsePositiveInt(fromEnv, 20, 50)
  }
  if (process.env.VITEST) return 2
  return 20
}

/**
 * Druid maxWaitMillis：≤0 表示无限排队等待借连接。
 * 仅当显式设为正数时才会排队超时失败。
 */
export function resolveMaxWaitMs(): number {
  const raw = process.env.DB_MAX_WAIT_MS
  if (!raw?.trim()) return 0
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

export function resolveConnectTimeoutSec(): number {
  return parsePositiveInt(process.env.DB_CONNECT_TIMEOUT, 60, 300)
}

export function resolveIdleTimeoutSec(): number {
  const fromEnv = process.env.DB_IDLE_TIMEOUT
  if (fromEnv?.trim()) {
    return parsePositiveInt(fromEnv, 60, 600)
  }
  return 60
}

export function resolveMaxLifetimeSec(): number {
  return parsePositiveInt(process.env.DB_MAX_LIFETIME, 600, 3600)
}

export type PoolDescribe = {
  maxActive: number
  maxWaitMs: number
  maxWaitLabel: string
  singleton: string
  connectTimeoutSec: number
  idleTimeoutSec: number
  queuePolicy: string
}

export function describeDbPool(connectionString: string): PoolDescribe {
  const maxActive = resolvePoolMax(connectionString)
  const maxWaitMs = resolveMaxWaitMs()
  return {
    maxActive,
    maxWaitMs,
    maxWaitLabel:
      maxWaitMs <= 0
        ? "无限等待（Druid maxWait=-1）"
        : `${maxWaitMs}ms`,
    singleton: "globalThis，每进程单池",
    connectTimeoutSec: resolveConnectTimeoutSec(),
    idleTimeoutSec: resolveIdleTimeoutSec(),
    queuePolicy:
      "两层排队：① 应用借连接队列 ② postgres.js 池满继续排队；占满不立刻失败",
  }
}
