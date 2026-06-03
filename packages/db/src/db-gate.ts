/**
 * Druid 式借连接：maxActive 槽位 + 占满排队（maxWait≤0 为无限等待）。
 * 与 postgres.js 池配合，避免压测瞬间并发冲垮 TCP 建连。
 */

export class DbPoolWaitTimeoutError extends Error {
  readonly code = "DB_POOL_WAIT_TIMEOUT" as const

  constructor(maxWaitMs: number) {
    super(
      `数据库连接池排队超时（已等待 ${maxWaitMs}ms）。` +
        "可调大 DB_MAX_WAIT_MS 或设为 0 表示无限等待（Druid maxWait=-1）。",
    )
    this.name = "DbPoolWaitTimeoutError"
  }
}

export type DbGateStats = {
  maxActive: number
  maxWaitMs: number
  active: number
  waiting: number
}

export class DbConcurrencyGate {
  private available: number
  private readonly waiters: Array<{
    grant: () => void
    timer?: ReturnType<typeof setTimeout>
  }> = []

  constructor(
    readonly maxActive: number,
    readonly maxWaitMs: number,
  ) {
    this.available = maxActive
  }

  stats(): DbGateStats {
    return {
      maxActive: this.maxActive,
      maxWaitMs: this.maxWaitMs,
      active: this.maxActive - this.available,
      waiting: this.waiters.length,
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const entry = {
        grant: () => resolve(),
        timer: undefined as ReturnType<typeof setTimeout> | undefined,
      }
      this.waiters.push(entry)

      if (this.maxWaitMs > 0) {
        entry.timer = setTimeout(() => {
          const i = this.waiters.indexOf(entry)
          if (i >= 0) {
            this.waiters.splice(i, 1)
            reject(new DbPoolWaitTimeoutError(this.maxWaitMs))
          }
        }, this.maxWaitMs)
      }
    })
  }

  private release(): void {
    const next = this.waiters.shift()
    if (next) {
      if (next.timer) clearTimeout(next.timer)
      next.grant()
      return
    }
    this.available++
  }
}
