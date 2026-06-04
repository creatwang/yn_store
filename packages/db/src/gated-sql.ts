import type { Sql } from "postgres"
import type { DbConcurrencyGate } from "./db-gate"

const BYPASS_GATE = new Set<PropertyKey>(["end"])

/**
 * postgres PendingQuery：unsafe() / 模板标签同步返回，执行在 .values() / await 时发生。
 * 须在「执行点」排队，不能把 unsafe() 包成 Promise。
 */
function wrapPendingQuery(gate: DbConcurrencyGate, query: unknown): unknown {
  if (query === null || (typeof query !== "object" && typeof query !== "function")) {
    return query
  }

  return new Proxy(query as object, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target)
      if (typeof value !== "function") return value
      return (...args: unknown[]) =>
        gate.run(async () => Reflect.apply(value, target, args))
    },
  })
}

/** 所有 SQL 经借连接队列；shutdown 的 end() 不排队避免死锁 */
export function wrapSqlWithGate(raw: Sql, gate: DbConcurrencyGate): Sql {
  return new Proxy(raw, {
    apply(_target, _thisArg, args) {
      return wrapPendingQuery(gate, Reflect.apply(raw, undefined, args))
    },
    get(target, prop, _receiver) {
      if (BYPASS_GATE.has(prop)) {
        return Reflect.get(target, prop, target)
      }
      const value = Reflect.get(target, prop, target)
      if (typeof value !== "function") return value

      if (prop === "unsafe") {
        return (...args: unknown[]) =>
          wrapPendingQuery(gate, Reflect.apply(value, target, args))
      }

      if (prop === "begin") {
        return (...args: unknown[]) =>
          gate.run(async () => Reflect.apply(value, target, args))
      }

      return (...args: unknown[]) =>
        gate.run(async () => Reflect.apply(value, target, args))
    },
  }) as Sql
}
