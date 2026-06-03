import type { Sql } from "postgres"
import type { DbConcurrencyGate } from "./db-gate"

const BYPASS_GATE = new Set<PropertyKey>(["end"])

function wrapFn<T extends (...args: never[]) => unknown>(
  gate: DbConcurrencyGate,
  fn: T,
): T {
  return ((...args: Parameters<T>) =>
    gate.run(async () => fn(...args))) as T
}

/** 所有 SQL 经借连接队列；shutdown 的 end() 不排队避免死锁 */
export function wrapSqlWithGate(raw: Sql, gate: DbConcurrencyGate): Sql {
  const gated = wrapFn(gate, raw as Sql) as Sql

  return new Proxy(gated, {
    get(target, prop, receiver) {
      if (BYPASS_GATE.has(prop)) {
        return Reflect.get(raw, prop, raw)
      }
      const value = Reflect.get(raw, prop, raw)
      if (typeof value === "function") {
        return wrapFn(gate, value as (...args: never[]) => unknown)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}
